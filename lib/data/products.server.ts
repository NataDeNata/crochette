import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import type { Product, ProductCategory } from "./products";

const BG_CYCLE = [
  "oklch(0.9 0.045 20)",
  "oklch(0.9 0.05 150)",
  "oklch(0.92 0.03 260)",
  "oklch(0.9 0.05 60)",
  "oklch(0.93 0.03 20)",
  "oklch(0.91 0.04 150)",
];

/** `bg`/`placeholder` aren't real columns — there's no product photography yet,
 * so they're derived here the same way the old mock catalog derived them. */
async function fetchActiveProducts(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(asc(products.createdAt));

  return rows.map((row, i) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.priceCents,
    category: row.category as ProductCategory,
    tag: row.tag ?? undefined,
    bg: BG_CYCLE[i % BG_CYCLE.length],
    placeholder: `product shot — ${row.name.toLowerCase()}`,
  }));
}

/** Full catalog — used by the Shop page and the Home page's sliding showcase.
 * Server-only: queries the live database directly, so this must not be imported
 * from a client component (import `./products` for the `Product` type,
 * `CATEGORIES`, and `formatPrice` instead). */
export async function getProducts(): Promise<Product[]> {
  return fetchActiveProducts();
}
