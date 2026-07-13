import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

/** Lazily connects on first query, not on import — so routes that don't
 * touch the DB still build/render even before DATABASE_URL is configured. */
function getDb(): Db {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string (e.g. from Neon or Supabase) to .env.local — see .env.example."
    );
  }
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
