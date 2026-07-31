import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The token that says "this admin's password has already been checked."
 *
 * Admin login is two steps once TOTP is enrolled, and the second step needs
 * some proof that the first one passed. The obvious options were both bad:
 * re-posting the password from a hidden field puts it back in the DOM, and
 * re-verifying it in step two spends a second ~250ms bcrypt on every login.
 *
 * So step one verifies the password and mints one of these; step two submits
 * only the six-digit code, and `authorize()` (lib/auth.ts) accepts the pair.
 * It rides in an httpOnly cookie scoped to `/admin/login`, so it is never
 * readable by script and never sent anywhere else.
 *
 * **It is not single-use.** Within its short life, anyone holding the cookie
 * can replay it — but holding it already requires having submitted the correct
 * password, so the replay window grants nothing the password did not. Making it
 * single-use would mean a Redis round-trip on the login path that fails
 * *closed* (an Upstash blip would lock the owner out of their own back office),
 * which is a worse trade than the three minutes below. The second factor is
 * still checked on every use — `authorize()` re-reads the code each time, so a
 * replayed challenge without a fresh valid code gets nothing.
 */

/** Long enough to fetch a code from a phone in another room, short enough that
 * a stolen cookie is rarely still live. */
const CHALLENGE_TTL_MS = 3 * 60 * 1000;

export const ADMIN_CHALLENGE_COOKIE = "admin_login_challenge";

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign admin login challenges");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** `<adminId>.<expiresAt>.<hmac>`. */
export function mintAdminChallenge(adminId: string, now = Date.now()): string {
  const payload = `${adminId}.${now + CHALLENGE_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** The admin id this token vouches for, or null if it is malformed, expired, or
 * not signed by us. */
export function verifyAdminChallenge(token: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [adminId, expiresAt, providedSignature] = parts;
  const expected = Buffer.from(sign(`${adminId}.${expiresAt}`));
  const provided = Buffer.from(providedSignature);

  // Signature first, then expiry: checking expiry first would answer faster for
  // an expired token than a forged one, which distinguishes the two.
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || now >= expiry) return null;

  return adminId;
}
