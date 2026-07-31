import { config } from "dotenv";
config({ path: ".env.local" });

import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { admins } from "./schema";

/** Creates or updates an admin login. Re-run with the same email and a new
 * password any time to change it — usage:
 * `npm run db:seed-admin -- <email> <password> [--clear-2fa]`.
 *
 * `--clear-2fa` is the break-glass path, and the reason it exists is that
 * without it there isn't one. Two-factor is deliberately not removable from the
 * login screen, so an owner who has lost both their authenticator and their
 * backup codes has no way back in — resetting the password alone still leaves
 * them at a code prompt they cannot answer. Running this needs the database
 * credentials, which is already total control over the account, so it grants
 * nothing new; it just means the recovery is a documented command instead of
 * hand-written SQL at the worst possible moment. */
async function main() {
  const args = process.argv.slice(2);
  const clearTwoFactor = args.includes("--clear-2fa");
  const [email, password] = args.filter((a) => a !== "--clear-2fa");
  if (!email || !password) {
    console.error("Usage: npm run db:seed-admin -- <email> <password> [--clear-2fa]");
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);

  // `passwordChangedAt` is what makes this actually revoke live sessions
  // rather than only affecting the next login — lib/auth.ts's jwt callback
  // rejects any admin session issued before this instant. Set on both paths:
  // on insert it establishes the baseline, on update it does the revoking.
  // Two-factor is left alone unless asked for. A routine password rotation
  // must not quietly disarm the second factor — that would make this command a
  // way to downgrade the account's security as a side effect.
  const clearedTotp = { totpSecret: null, totpConfirmedAt: null, totpBackupCodes: null };

  await db
    .insert(admins)
    .values({ email: email.toLowerCase(), passwordHash, passwordChangedAt: new Date() })
    .onConflictDoUpdate({
      target: admins.email,
      set: {
        passwordHash: sql`excluded.password_hash`,
        passwordChangedAt: sql`now()`,
        ...(clearTwoFactor ? clearedTotp : {}),
      },
    });

  console.log(`Admin account ready for ${email}. Any existing admin sessions are now signed out.`);
  if (clearTwoFactor) {
    console.log("Two-factor authentication was removed — set it up again from /admin/settings.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Admin seed failed:", err);
  process.exit(1);
});
