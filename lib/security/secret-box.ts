import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Authenticated encryption for the one secret that has to be stored
 * *recoverable* rather than hashed: an admin's TOTP seed.
 *
 * Every other credential in this project is a bcrypt hash, which is the right
 * shape because verification only needs "does this match". A TOTP seed is
 * different — the server has to reproduce the code from it on every login, so
 * it must be readable. Storing it in the clear would mean a database dump alone
 * is enough to mint valid second factors, which defeats the point of adding a
 * second factor to a database that already holds the password hash.
 *
 * The key is derived from `AUTH_SECRET`, which lives in the environment and is
 * a Vercel **Sensitive** variable — so it is not in the same blast radius as a
 * Postgres dump. The flip side, and it is a real one: **rotating `AUTH_SECRET`
 * makes every enrolled TOTP secret undecryptable.** That is already true of
 * every live session (it signs the JWTs) — the difference is that a rotation
 * now also requires each admin to re-enrol their authenticator. `decryptSecret`
 * returns null rather than throwing on that, so the failure surfaces as "your
 * code isn't working, re-enrol" instead of a 500 on the login path.
 */

const KEY_INFO = "crochette:totp-secret:v1";
const IV_BYTES = 12; // GCM's standard nonce length.

let cachedKey: Buffer | undefined;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to encrypt/decrypt TOTP secrets");
  // scrypt is deliberately slow, hence the module-level cache — this runs once
  // per server instance, not once per login.
  cachedKey = scryptSync(secret, KEY_INFO, 32);
  return cachedKey;
}

/** Returns `iv.ciphertext.tag`, all base64url — one opaque text column. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ciphertext, tag].map((b) => b.toString("base64url")).join(".");
}

/** Null on anything that doesn't decrypt cleanly — a malformed value, a
 * tampered ciphertext (GCM's tag check fails), or a rotated `AUTH_SECRET`.
 * Callers treat all three the same way: the second factor is unusable, so the
 * account falls back to backup codes or a fresh enrolment. */
export function decryptSecret(stored: string): string | null {
  try {
    const [ivB64, dataB64, tagB64] = stored.split(".");
    if (!ivB64 || !dataB64 || !tagB64) return null;

    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
