import { config } from "dotenv";
config({ path: ".env.local" });

import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { admins } from "./schema";

/** Creates or updates an admin login. Re-run with the same email and a new
 * password any time to change it — usage: `npm run db:seed-admin -- <email> <password>`. */
async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run db:seed-admin -- <email> <password>");
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);

  await db
    .insert(admins)
    .values({ email: email.toLowerCase(), passwordHash })
    .onConflictDoUpdate({
      target: admins.email,
      set: { passwordHash: sql`excluded.password_hash` },
    });

  console.log(`Admin account ready for ${email}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Admin seed failed:", err);
  process.exit(1);
});
