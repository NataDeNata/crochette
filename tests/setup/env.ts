import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Loads `.env.test` and NOTHING else.
 *
 * Deliberately not `dotenv/config` and deliberately no `.env.local` fallback:
 * `.env.local` holds the live Supabase connection string alongside real Xendit,
 * Resend and Upstash credentials. A test run must not be able to reach any of
 * them, whatever the ambient environment happens to contain.
 *
 * `override: true` matters — a stale DATABASE_URL exported in the shell would
 * otherwise win over the file and quietly point the suite somewhere real.
 */
export function loadTestEnv(): void {
  config({ path: path.join(REPO_ROOT, ".env.test"), override: true, quiet: true });
}

/**
 * The one load-bearing guard in the whole test harness.
 *
 * Integration tests TRUNCATE every table between cases. That is safe only for a
 * disposable local database, so this proves the target is one before anything
 * connects: the host must be loopback and the database name must end in
 * `_test`. Anything else — a hostname, a non-test database, a malformed URL —
 * throws instead of connecting.
 *
 * Returns the verified URL so callers can't accidentally use an unchecked one.
 */
export function assertDisposableTestDatabase(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Start the test database with `npm run db:test:up` — see .env.test."
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid URL — refusing to connect.");
  }

  const host = url.hostname;
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const database = url.pathname.replace(/^\//, "");

  if (!isLoopback) {
    throw new Error(
      `Refusing to run integration tests against host "${host}". The suite truncates every table, ` +
        `so it may only target a disposable database on localhost. Check .env.test.`
    );
  }

  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against database "${database}" — the name must end in "_test". ` +
        `This is what stops a truncate from ever reaching a real database. Check .env.test.`
    );
  }

  return rawUrl;
}
