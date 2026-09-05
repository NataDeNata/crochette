import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The token that lets a guest reach their own order confirmation without an
 * account. Same idiom as lib/security/admin-challenge.ts and
 * lib/cart/cookie.ts: an HMAC over the payload under `AUTH_SECRET`, checked
 * with a length-guarded `timingSafeEqual` so a mismatched length can't leak
 * timing information about how close a forged signature came.
 *
 * No schema change and no stored state — the token is a signature over the
 * order id, verified fresh on every request.
 */

/** Long enough that a slow-to-open confirmation email still works months
 * later; short enough that a link leaked once doesn't stay live forever. */
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign order tokens");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** `<orderId>.<expiresAt>.<hmac>`. */
export function mintOrderToken(orderId: string, now = Date.now()): string {
  const payload = `${orderId}.${now + TOKEN_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** True if `token` is a live, unforged token minted for exactly `orderId`. */
export function verifyOrderToken(token: string, orderId: string, now = Date.now()): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenOrderId, expiresAt, providedSignature] = parts;
  if (tokenOrderId !== orderId) return false;

  const expected = Buffer.from(sign(`${tokenOrderId}.${expiresAt}`));
  const provided = Buffer.from(providedSignature);

  // Signature first, then expiry — see admin-challenge.ts's identical ordering:
  // checking expiry first would answer an expired token faster than a forged
  // one, which is itself a distinguishing signal.
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && now < expiry;
}
