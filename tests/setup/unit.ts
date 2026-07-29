import { loadTestEnv } from "./env";

/**
 * Unit-project setup. Runs before every file in `tests/unit/`.
 *
 * Loads `.env.test` for the handful of values a module needs merely to import
 * (AUTH_SECRET for the cart cookie, KV_REST_API_* because
 * lib/security/rate-limit.ts constructs its Redis client at module scope).
 *
 * `DATABASE_URL` is deliberately left UNSET. lib/db/index.ts throws on first
 * query when it's missing, so a unit test that reaches the database fails loudly
 * with that message rather than silently connecting to something.
 */
loadTestEnv();
delete process.env.DATABASE_URL;
