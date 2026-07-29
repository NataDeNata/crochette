import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { REPO_ROOT, assertDisposableTestDatabase, loadTestEnv } from "./env";

/**
 * Runs once, before the whole integration project.
 *
 * Waits for the container, then applies the real migrations from `drizzle/` —
 * the same 12 files production ran — so the schema under test cannot drift from
 * the schema in production. Uses drizzle-orm's programmatic `migrate()` rather
 * than the drizzle-kit CLI, because `drizzle.config.ts` loads `.env.local` and
 * would point at Supabase.
 */
export default async function setup() {
  loadTestEnv();
  const url = assertDisposableTestDatabase(process.env.TEST_DATABASE_URL);

  // Everything downstream (helpers, the app's own lib/db/index.ts) reads
  // DATABASE_URL. Set it only after the guard above has passed.
  process.env.DATABASE_URL = url;

  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

  await waitForDatabase(client, url);

  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(REPO_ROOT, "drizzle") });
  } finally {
    await client.end();
  }
}

/** The container accepts TCP before Postgres is ready to answer queries, so
 * poll a trivial statement rather than trusting the port being open. */
async function waitForDatabase(client: postgres.Sql, url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await client`select 1`;
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const host = new URL(url).host;
  throw new Error(
    `Could not reach the test database at ${host} within 30s. Is it running? Start it with ` +
      `\`npm run db:test:up\` (requires Docker Desktop).\nLast error: ${String(lastError)}`
  );
}
