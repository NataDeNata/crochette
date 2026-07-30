import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import type { UserRole } from "@/lib/auth-types";

/** A real bcrypt hash (cost 12, matching the stored ones) of a random string.
 *
 * Both `authorize` functions in lib/auth.ts compare against this when no
 * account matches, and throw the result away. Without it the not-found path
 * returns immediately while a real account spends ~250ms in bcrypt, so response
 * time reliably answers "does this email have an account here?" — and the
 * per-endpoint rate limit can't blunt that, because its key is `IP:email` and
 * varying the email gives a fresh bucket on every probe. (The IP-only
 * `auth-ip` limit added alongside this is the other half of that fix.)
 *
 * Lives here rather than in lib/auth.ts so a test can assert its cost factor
 * without importing the module that boots NextAuth. */
export const DUMMY_PASSWORD_HASH = "$2b$12$VZb.tIOJ4hGo0dB8AUb5.O8wby5cRqlVpaD/x0ikUjtFvlZP1px8m";

/** Absolute cap on an admin session, measured from sign-in.
 *
 * A working day. The admin account can read every customer's name, email,
 * phone and shipping address, which is what makes a long-lived non-revocable
 * session the least comfortable item in the 2026-07-30 auth review.
 *
 * This has to be an *absolute* cap checked against a sign-in stamp rather than
 * the cookie's own expiry: @auth/core's session handler re-signs the token with
 * a fresh `maxAge` on every read (see lib/actions/session.js — `newExpires =
 * fromDate(sessionMaxAge)`), so a session that is merely *used* regularly never
 * expires on its own no matter what `session.maxAge` is set to. */
export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/** Has this session outlived its role's absolute cap?
 *
 * Customers are exempt — they keep the 30-day `session.maxAge` and hold no
 * access to anyone's data but their own.
 *
 * A missing `authTime` means the token predates this feature. Those are
 * deliberately *not* force-expired: signing every existing admin out mid-flight
 * buys nothing, and the token still dies at its own 30-day mark. */
export function isAbsoluteSessionExpired(
  role: UserRole | undefined,
  authTime: number | undefined,
  now: number
): boolean {
  if (role !== "admin") return false;
  if (typeof authTime !== "number") return false;
  return now - authTime >= ADMIN_SESSION_MAX_AGE_MS;
}

/** Was the account's password rotated after this session was issued?
 *
 * Admin-only, one PK lookup. `npm run db:seed-admin` stamps
 * `admins.passwordChangedAt` on every change, so this is what turns a password
 * rotation into an actual revocation of live sessions rather than a change that
 * only affects the *next* login.
 *
 * Scoped to admin on purpose: `customers.passwordChangedAt` exists but nothing
 * writes it yet (no self-service change, no reset), so checking it would add a
 * DB round-trip to every shopper's every request to learn a value that is
 * always null. See the column comment in lib/db/schema.ts.
 *
 * Fails **open** on a database error — a Supabase blip should not log the owner
 * out of the back office. The absolute cap above is the guarantee that does not
 * depend on the database being reachable. */
export async function hasPasswordChangedSince(
  role: UserRole | undefined,
  userId: string | undefined,
  authTime: number | undefined
): Promise<boolean> {
  if (role !== "admin" || !userId || typeof authTime !== "number") return false;

  const [row] = await db
    .select({ passwordChangedAt: admins.passwordChangedAt })
    .from(admins)
    .where(eq(admins.id, userId))
    .limit(1);

  if (!row?.passwordChangedAt) return false;
  return row.passwordChangedAt.getTime() > authTime;
}
