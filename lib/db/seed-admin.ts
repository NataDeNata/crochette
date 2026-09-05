import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "node:readline";
import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { admins } from "./schema";

/** A password typed as a CLI argument persists in shell history and is
 * readable from the process table (`ps`) by anyone else on the machine for
 * as long as the process runs. Node has no built-in masked-input prompt, so
 * this is the standard workaround: `readline`'s own `_writeToOutput` hook
 * (undocumented, but stable across Node versions) is overridden to swallow
 * everything except the prompt text itself and the newline that ends input —
 * i.e. the typed characters never reach the terminal at all. */
function promptPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const rlInternal = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WritableStream };
    rlInternal._writeToOutput = (stringToWrite: string) => {
      if (stringToWrite === query || /[\r\n]/.test(stringToWrite)) {
        rlInternal.output.write(stringToWrite);
      }
    };
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/** Creates or updates an admin login. Re-run with the same email any time to
 * change the password — usage:
 * `npm run db:seed-admin -- <email> [--clear-2fa]`. The password is read from
 * a prompt, not an argument.
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
  const [email] = args.filter((a) => a !== "--clear-2fa");
  if (!email) {
    console.error("Usage: npm run db:seed-admin -- <email> [--clear-2fa]");
    process.exit(1);
  }

  const password = await promptPassword("Password: ");
  process.stdout.write("\n");
  if (!password) {
    console.error("A password is required.");
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
