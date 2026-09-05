import { compare, hash } from "bcryptjs";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import {
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  totpQrSvg,
  totpUri,
  verifyTotp,
  verifyTotpStep,
} from "@/lib/security/totp";

/** Same cost factor as every other password in this project (customers,
 * `db:seed-admin`) — a change here without changing those makes the two
 * silently disagree about how expensive a hash is. */
const BCRYPT_COST = 12;

export type AdminSecurityState = {
  email: string;
  /** Null when no second factor is active. */
  totpConfirmedAt: Date | null;
  /** True when a setup was started but never confirmed with a working code. */
  totpPending: boolean;
  /** Unused backup codes left. Zero with 2FA on is a real, reportable state:
   * the owner has spent them all and can no longer get in without their
   * authenticator. */
  backupCodesRemaining: number;
};

export async function getAdminSecurityState(adminId: string): Promise<AdminSecurityState | null> {
  const [row] = await db
    .select({
      email: admins.email,
      totpSecret: admins.totpSecret,
      totpConfirmedAt: admins.totpConfirmedAt,
      totpBackupCodes: admins.totpBackupCodes,
    })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!row) return null;

  return {
    email: row.email,
    totpConfirmedAt: row.totpConfirmedAt,
    totpPending: row.totpSecret !== null && row.totpConfirmedAt === null,
    backupCodesRemaining: row.totpBackupCodes?.length ?? 0,
  };
}

/**
 * Verify a password against the stored hash for this admin.
 *
 * Used to re-authenticate before every sensitive change on the settings page,
 * not just the password change itself: turning off the second factor and
 * reissuing backup codes are both ways to weaken the account, so both ask for
 * the password again. That is what makes a walked-away-from session a smaller
 * problem than the 8-hour cap alone would.
 */
export async function verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
  const [row] = await db
    .select({ passwordHash: admins.passwordHash })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!row) return false;
  return compare(password, row.passwordHash);
}

/**
 * Set a new password and revoke every live session.
 *
 * `passwordChangedAt` is the whole point of the second write: lib/auth.ts's jwt
 * callback rejects any admin token stamped before it, so a rotation actually
 * signs other devices out instead of only affecting the next login. It also
 * signs *this* device out, which is why the caller redirects to the login page
 * rather than pretending the current session survived.
 */
export async function setAdminPassword(adminId: string, newPassword: string): Promise<void> {
  const passwordHash = await hash(newPassword, BCRYPT_COST);
  await db
    .update(admins)
    .set({ passwordHash, passwordChangedAt: new Date() })
    .where(eq(admins.id, adminId));
}

export type TotpEnrolment = { secret: string; uri: string; qrSvg: string };

/**
 * Start (or restart) enrolment: a fresh seed, stored encrypted and *not* yet
 * active.
 *
 * Restarting overwrites any half-finished attempt, which is the behaviour that
 * makes a mis-scanned QR recoverable — the alternative is a stuck pending state
 * with no way out but SQL. It cannot overwrite a *confirmed* secret: the caller
 * gates on that, so a working authenticator is never silently replaced.
 */
export async function beginTotpEnrolment(adminId: string, email: string): Promise<TotpEnrolment> {
  const secret = generateTotpSecret();

  await db
    .update(admins)
    .set({ totpSecret: encryptSecret(secret), totpConfirmedAt: null })
    .where(eq(admins.id, adminId));

  const uri = totpUri(secret, email);
  return { secret, uri, qrSvg: await totpQrSvg(uri) };
}

/** Re-derive the enrolment view from the stored pending secret, so a page
 * reload during setup shows the same QR rather than silently reissuing one the
 * authenticator has already scanned. Null if there is no pending enrolment (or
 * the stored secret no longer decrypts — see secret-box.ts). */
export async function getPendingTotpEnrolment(adminId: string, email: string): Promise<TotpEnrolment | null> {
  const [row] = await db
    .select({ totpSecret: admins.totpSecret, totpConfirmedAt: admins.totpConfirmedAt })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!row?.totpSecret || row.totpConfirmedAt) return null;

  const secret = decryptSecret(row.totpSecret);
  if (!secret) return null;

  const uri = totpUri(secret, email);
  return { secret, uri, qrSvg: await totpQrSvg(uri) };
}

/**
 * Confirm enrolment with a code from the app, and hand back the backup codes.
 *
 * The plaintext codes are returned here and nowhere else — only their hashes
 * are stored, so this return value is the *only* time they exist in a readable
 * form. The UI has to show them on this render or they are gone.
 */
export async function confirmTotpEnrolment(
  adminId: string,
  code: string,
): Promise<{ ok: false } | { ok: true; backupCodes: string[] }> {
  const [row] = await db
    .select({ totpSecret: admins.totpSecret, totpConfirmedAt: admins.totpConfirmedAt })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!row?.totpSecret || row.totpConfirmedAt) return { ok: false };

  const secret = decryptSecret(row.totpSecret);
  if (!secret || !verifyTotp(secret, code)) return { ok: false };

  const backupCodes = generateBackupCodes();
  await db
    .update(admins)
    .set({ totpConfirmedAt: new Date(), totpBackupCodes: backupCodes.map(hashBackupCode) })
    .where(eq(admins.id, adminId));

  return { ok: true, backupCodes };
}

/** Issue a fresh set, invalidating every previously printed code. */
export async function regenerateBackupCodes(adminId: string): Promise<string[]> {
  const backupCodes = generateBackupCodes();
  await db
    .update(admins)
    .set({ totpBackupCodes: backupCodes.map(hashBackupCode) })
    .where(eq(admins.id, adminId));
  return backupCodes;
}

/** Turn the second factor off and drop everything belonging to it, so a
 * later re-enrolment starts from a clean seed rather than reviving codes the
 * owner may have printed and lost. */
export async function disableTotp(adminId: string): Promise<void> {
  await db
    .update(admins)
    .set({ totpSecret: null, totpConfirmedAt: null, totpBackupCodes: null })
    .where(eq(admins.id, adminId));
}

/**
 * The login-time check: is this six-digit code — or backup code — valid for
 * this admin right now?
 *
 * Matching a backup code and spending it are the *same statement*, deliberately.
 * Read-then-write would let two requests submitting the same code both read it
 * as unused and both succeed, which is exactly the property a single-use code
 * is supposed to deny. Instead the match lives in the `WHERE`: the first
 * request removes the hash, the second finds nothing to remove and gets no
 * row back. `RETURNING` is what turns that into the answer.
 *
 * A TOTP code gets the same "match and spend in one statement" treatment,
 * against `totpLastStep` rather than a code list: the drift window otherwise
 * makes a code valid for ~90s, during which it can be replayed as many times
 * as it's submitted. Bounded below by the *last accepted* step, not "not
 * equal to it", so a stale step within the current drift window can't be
 * replayed just because it isn't the most recent one.
 */
export async function verifyAdminSecondFactor(adminId: string, code: string): Promise<boolean> {
  const [row] = await db
    .select({ totpSecret: admins.totpSecret, totpConfirmedAt: admins.totpConfirmedAt })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  // No confirmed enrolment means there is no second factor to satisfy. The
  // caller decides whether that is allowed; this only answers "did it match".
  if (!row?.totpConfirmedAt || !row.totpSecret) return false;

  const secret = decryptSecret(row.totpSecret);
  const step = secret ? verifyTotpStep(secret, code) : null;
  if (step !== null) {
    const accepted = await db
      .update(admins)
      .set({ totpLastStep: step })
      .where(and(eq(admins.id, adminId), or(isNull(admins.totpLastStep), lt(admins.totpLastStep, step))))
      .returning({ id: admins.id });
    if (accepted.length > 0) return true;
  }

  const codeHash = hashBackupCode(code);
  const consumed = await db
    .update(admins)
    .set({ totpBackupCodes: sql`array_remove(${admins.totpBackupCodes}, ${codeHash})` })
    .where(and(eq(admins.id, adminId), sql`${codeHash} = ANY(${admins.totpBackupCodes})`))
    .returning({ id: admins.id });

  return consumed.length > 0;
}
