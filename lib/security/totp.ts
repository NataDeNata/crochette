import { createHash, randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

/**
 * RFC 6238 TOTP, plus the single-use backup codes that go with it.
 *
 * `otpauth` rather than a hand-rolled HMAC loop: the arithmetic is short enough
 * to look easy and has enough edges (base32 alphabet and padding, counter
 * endianness, the drift window) that getting one subtly wrong produces a thing
 * that works in testing and locks the owner out in six months. This is also the
 * one dependency choice here that differs from lib/payments/xendit.ts's
 * hand-written client — a REST call is inspectable when it misbehaves; a
 * wrong TOTP code just says "invalid".
 */

const ISSUER = "Crochette";

/** SHA-1/6-digit/30-second, and none of those are a modernisation opportunity:
 * they are what Google Authenticator, 1Password, Aegis and the rest actually
 * implement. An SHA-256 or 8-digit setup scans fine and then silently produces
 * rejected codes in several popular apps. */
const TOTP_CONFIG = { algorithm: "SHA1", digits: 6, period: 30 } as const;

/**
 * ±1 period — one code either side of now, so a 30s window becomes ~90s of
 * tolerance for a phone whose clock has drifted. RFC 6238 §5.2 recommends
 * exactly one step. Widening it multiplies the guess space a brute-forcer gets
 * per attempt, which is why the rate limit on the code form matters as much as
 * this number does.
 */
const VALIDATION_WINDOW = 1;

function totpFor(secretBase32: string, email: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    ...TOTP_CONFIG,
    issuer: ISSUER,
    label: email,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

/** A fresh 160-bit seed, base32-encoded — the size RFC 4226 §4 requires and
 * every authenticator app expects. */
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** The `otpauth://` URI an authenticator app consumes, shown as a QR *and* as
 * the raw secret, since not every app can use a camera. */
export function totpUri(secretBase32: string, email: string): string {
  return totpFor(secretBase32, email).toString();
}

/** The enrolment QR as an inline SVG string. SVG rather than a PNG data URI so
 * it stays crisp at any size and adds no base64 weight to the HTML. */
export async function totpQrSvg(uri: string): Promise<string> {
  return QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

/** True when `token` is valid for this secret, now or one period either side.
 *
 * Non-digits are stripped first: authenticator apps display "123 456" and
 * people paste what they see. */
export function verifyTotp(secretBase32: string, token: string): boolean {
  const normalized = token.replace(/\D/g, "");
  if (normalized.length !== TOTP_CONFIG.digits) return false;
  // `validate` returns the delta (0, ±1) on a match and null otherwise — note
  // that 0 is a *valid* result, so this cannot be a truthiness check.
  return totpFor(secretBase32, "unused").validate({ token: normalized, window: VALIDATION_WINDOW }) !== null;
}

const BACKUP_CODE_COUNT = 10;
/** 10 base32 characters ≈ 50 bits. See the hashing note below for why the
 * length is doing security work here. */
const BACKUP_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1
const BACKUP_CODE_LENGTH = 10;

/** Ten one-time codes, displayed once at enrolment and never again. */
export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    // Rejection-free because 31 doesn't divide 256 evenly and a modulo bias of
    // ~0.4% across a 50-bit code is not a meaningful weakening. Using
    // randomBytes (CSPRNG) rather than Math.random is the part that matters.
    const bytes = randomBytes(BACKUP_CODE_LENGTH);
    const code = [...bytes].map((b) => BACKUP_CODE_CHARS[b % BACKUP_CODE_CHARS.length]).join("");
    // Hyphenated purely for transcription; stripped again before hashing.
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  });
}

export function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * SHA-256, not bcrypt — a deliberate departure from how passwords are stored
 * two files over.
 *
 * bcrypt's cost factor exists to make guessing a *human-chosen* secret
 * expensive. A backup code is 50 bits from a CSPRNG, so guessing is already out
 * of reach and the slow hash buys nothing. It would cost something, though:
 * verification has to try the submitted code against every unused hash, so ten
 * cost-12 comparisons would put ~2.5 seconds on the login path, and enrolment
 * would spend the same again generating them.
 *
 * Being a fast hash also lets the *match* happen in Postgres rather than here
 * — `verifyAdminSecondFactor` compares this hash inside the same UPDATE that
 * spends the code (lib/db/admin-account.ts), which is what makes "used once"
 * actually hold under a race.
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}
