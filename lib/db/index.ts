import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// In dev, Next's Fast Refresh re-evaluates this module on nearly every save,
// which would reset a module-level `let` and leak a fresh postgres.js
// connection pool each time — the DB runs out of client slots after enough
// reloads. Stashing the client on `globalThis` survives module reloads
// (globalThis itself doesn't get reset), so dev reuses one pool for the
// life of the server process, same as production's module-singleton.
const globalForDb = globalThis as unknown as { __db?: Db };

/** Lazily connects on first query, not on import — so routes that don't
 * touch the DB still build/render even before DATABASE_URL is configured. */
function getDb(): Db {
  if (globalForDb.__db) return globalForDb.__db;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string (e.g. from Neon or Supabase) to .env.local — see .env.example."
    );
  }
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const instance = drizzle(client, { schema });
  globalForDb.__db = instance;
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
