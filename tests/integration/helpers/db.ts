import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { assertDisposableTestDatabase } from "../../setup/env";

/**
 * The integration suite's own database handle.
 *
 * Separate from the app's `lib/db/index.ts` singleton on purpose: helpers and
 * factories use this one, while code under test uses the app's, so a test can
 * observe exactly what production code committed rather than reading back
 * through the same connection it wrote on. Both point at the same container —
 * `tests/setup/global-db.ts` sets DATABASE_URL after the safety check passes.
 */
const url = assertDisposableTestDatabase(process.env.TEST_DATABASE_URL);
const client = postgres(url, { max: 3, prepare: false, onnotice: () => {} });

export const testDb = drizzle(client, { schema });

/** Every table, child-first. Order is irrelevant for TRUNCATE ... CASCADE but
 * the list is exhaustive on purpose: a table added to the schema and forgotten
 * here would leak rows between tests. */
const ALL_TABLES = [
  "cart_items",
  "carts",
  "order_items",
  "orders",
  "product_images",
  "products",
  "custom_order_requests",
  "contact_messages",
  "addresses",
  "customers",
  "admins",
  "discount_codes",
] as const;

/**
 * Wipes every table between tests. Cheap here — the container's data directory
 * is a tmpfs, so this never touches a disk.
 *
 * RESTART IDENTITY is a no-op for these tables (all ids are uuids) and is kept
 * so it stays correct if a serial column is ever added.
 */
export async function resetDb(): Promise<void> {
  await testDb.execute(
    sql.raw(`truncate table ${ALL_TABLES.join(", ")} restart identity cascade`)
  );
}

export async function closeTestDb(): Promise<void> {
  await client.end();
}

/**
 * Runs `fn` inside a transaction that is always rolled back.
 *
 * Not the default isolation mechanism — `resetDb` is, because several functions
 * under test (`resolveDiscountCode`, `getOrderProductSlugs`) close over the
 * app's module-level `db` and accept no executor, so a caller-supplied
 * transaction cannot reach them. This exists for the tests that specifically
 * need to exercise transactional behaviour, such as passing an executor into
 * `mergeCarts`.
 */
export async function withRollback<T>(
  fn: (tx: Parameters<Parameters<typeof testDb.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  let result: T;
  try {
    await testDb.transaction(async (tx) => {
      result = await fn(tx);
      tx.rollback(); // throws TransactionRollbackError — that is how drizzle rolls back
    });
  } catch (err) {
    // Drizzle signals a deliberate rollback by throwing; anything else is real.
    if (!(err instanceof Error) || err.name !== "TransactionRollbackError") throw err;
  }
  return result!;
}
