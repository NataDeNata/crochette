import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The two links Stage B is built on: "prove this address is yours" and "set a
 * new password."
 *
 * Same idiom as lib/security/admin-challenge.ts and lib/security/order-token.ts
 * — an HMAC over a dotted payload under `AUTH_SECRET`, compared with a
 * length-guarded `timingSafeEqual`, signature checked *before* expiry so an
 * expired token and a forged one cannot be told apart by response time. No
 * token table, no cleanup job, no schema of its own.
 *
 * Two things are deliberate and load-bearing:
 *
 * **The purpose is inside the signature.** Both tokens are HMACs under the same
 * secret over a payload that starts with the customer id, so without a purpose
 * field a verification link — which may live for days and is mailed to an
 * address that has *not* yet been proven — would be a validly signed password
 * reset. `verify*` refuses a token minted for the other purpose before it looks
 * at anything else.
 *
 * **The bound field is what makes each one safe.** A verification token binds
 * the address being proven, so a token minted for one address cannot verify a
 * different one if the account's email later changes. A reset token binds the
 * account's current `password_changed_at`, which makes it single-use for free:
 * completing a reset advances that timestamp, invalidating the token just spent
 * and every other outstanding one at the same moment, with nothing stored.
 */

/** A verification link may sit in an inbox over a weekend and still work; it
 * proves an address rather than granting access, and replaying it is
 * idempotent. */
const VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A reset link hands over the account, so it is measured in hours. Long enough
 * to survive a slow mail relay and a distracted shopper, short enough that a
 * link left in an inbox is rarely still live. */
const RESET_TTL_MS = 2 * 60 * 60 * 1000;

type Purpose = "v1" | "r1";

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign account tokens");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** `.` is the field separator, and an email address may contain one — so the
 * bound address rides base64url-encoded rather than raw. Without this,
 * `a.b@example.com` would split into the wrong number of fields and read as
 * malformed. */
function encodeField(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeField(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

/** `<purpose>.<customerId>.<bound>.<expiresAt>.<hmac>` for both kinds. */
function mint(purpose: Purpose, customerId: string, bound: string, ttlMs: number, now: number): string {
  const payload = `${purpose}.${customerId}.${bound}.${now + ttlMs}`;
  return `${payload}.${sign(payload)}`;
}

/** The shared half of both verifiers: shape, purpose, signature, expiry — in
 * that order. Returns the customer id and the bound field, or null. */
function open(
  token: string,
  purpose: Purpose,
  now: number
): { customerId: string; bound: string } | null {
  const parts = token.split(".");
  if (parts.length !== 5) return null;

  const [tokenPurpose, customerId, bound, expiresAt, providedSignature] = parts;
  // Before the signature check on purpose: the purposes are disjoint, so this
  // is not a secret-dependent comparison and leaks nothing by answering early.
  if (tokenPurpose !== purpose) return null;

  const expected = Buffer.from(sign(`${tokenPurpose}.${customerId}.${bound}.${expiresAt}`));
  const provided = Buffer.from(providedSignature);

  // Signature first, then expiry — see order-token.ts's identical ordering.
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || now >= expiry) return null;

  return { customerId, bound };
}

/** Mints the link mailed at signup and on every resend. `email` is the address
 * being proven, and the caller must check it still matches the account's
 * current address before acting on a verified token. */
export function mintEmailVerificationToken(customerId: string, email: string, now = Date.now()): string {
  return mint("v1", customerId, encodeField(email.trim().toLowerCase()), VERIFICATION_TTL_MS, now);
}

/** The customer id and the address the token proves, or null if it is
 * malformed, expired, forged, or a reset token wearing the wrong hat. */
export function verifyEmailVerificationToken(
  token: string,
  now = Date.now()
): { customerId: string; email: string } | null {
  const opened = open(token, "v1", now);
  if (!opened) return null;

  let email: string;
  try {
    email = decodeField(opened.bound);
  } catch {
    // Unreachable through a token we minted — the signature already passed —
    // but base64url decoding is not total, and a throw here would surface as a
    // 500 on a link a shopper clicked.
    return null;
  }
  if (!email) return null;

  return { customerId: opened.customerId, email };
}

/** Binds the account's `password_changed_at` as it stands right now. A null
 * stamp (every account that has never rotated a password) binds as `0`, which
 * is a real value like any other — the first completed reset moves it, and
 * every token minted against the null state dies with it. */
export function mintPasswordResetToken(
  customerId: string,
  passwordChangedAt: Date | null,
  now = Date.now()
): string {
  return mint("r1", customerId, String(passwordChangedAt?.getTime() ?? 0), RESET_TTL_MS, now);
}

/** The customer id and the `password_changed_at` the token was minted against.
 * The caller compares that against the row it loads: a mismatch means the
 * password has moved since — the token has been spent, or another reset
 * superseded it — and the link is dead. */
export function verifyPasswordResetToken(
  token: string,
  now = Date.now()
): { customerId: string; passwordChangedAtMs: number } | null {
  const opened = open(token, "r1", now);
  if (!opened) return null;

  const passwordChangedAtMs = Number(opened.bound);
  if (!Number.isFinite(passwordChangedAtMs)) return null;

  return { customerId: opened.customerId, passwordChangedAtMs };
}
