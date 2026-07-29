import { afterAll, beforeEach } from "vitest";
import { loadTestEnv, assertDisposableTestDatabase } from "./env";
import { closeTestDb, resetDb } from "../integration/helpers/db";

/**
 * Integration-project setup. Runs before every file in `tests/integration/`.
 *
 * `global-db.ts` already loaded the env and applied migrations once for the
 * whole run, but each test file executes in its own module context, so the env
 * has to be re-established here — including the safety check, which is cheap and
 * must never be skippable.
 */
loadTestEnv();
process.env.DATABASE_URL = assertDisposableTestDatabase(process.env.TEST_DATABASE_URL);

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeTestDb();
});
