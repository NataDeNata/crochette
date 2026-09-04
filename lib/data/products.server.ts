import { cache } from "react";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, productImages, orderItems, orders } from "@/lib/db/schema";
import { REVENUE_STATUSES } from "@/lib/db/analytics";
import type { Product, ProductCategory, ProductImage } from "./products";
import { BG_CYCLE_CLASSES } from "./bg-cycle";

/** How many active best-sellers get the "Bestseller" badge — matches the
 * landing page's Top Sellers rail (§6.1 of the docs), so the two surfaces
 * can't disagree about who counts as a bestseller. */
const BESTSELLER_BADGE_COUNT = 3;

/** A product created within this window is "New" — unless it also qualifies
 * as a Bestseller, which takes priority (see `computeAutoTag`). */
const NEW_BADGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Replaces the old admin-typed `tag` column for display purposes. The
 * column still exists (nullable, unused) rather than being dropped in the
 * same pass that stops writing to it — see the note on `products.tag` in
 * lib/db/schema.ts and `app/admin/products/actions.ts`.
 *
 * Bestseller beats New on purpose: a piece selling well is a stronger signal
 * than its age, and in practice they rarely collide anyway — a brand-new
 * product has had no time to accumulate sales. */
function computeAutoTag(createdAt: Date, isBestseller: boolean): string | undefined {
  if (isBestseller) return "Bestseller";
  if (Date.now() - createdAt.getTime() <= NEW_BADGE_WINDOW_MS) return "New";
  return undefined;
}

/** `bg`/`placeholder` are the pre-photography fallback — derived here the
 * same way the old mock catalog derived them, and still used whenever a
 * product has zero uploaded images.
 *
 * Wrapped in React's `cache()`, which deduplicates it per request. Without it a
 * single product page ran this three times — `generateMetadata` calls
 * `getProductBySlug`, the page calls it again, and the related rail calls
 * `getProducts` — for six queries where two do. `lib/auth.ts` wraps `auth()`
 * for exactly this reason.
 *
 * Memoizing rather than adding a by-slug query is deliberate: `bgClassName` is
 * assigned by a product's index within the whole active catalogue, so a single
 * row cannot be read on its own without changing what colour it gets. */
const fetchActiveProducts = cache(async (): Promise<Product[]> => {
  const [rows, topSellingIds] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq(products.status, "active"))
      /* The `id` tiebreak is not decoration. Six of the seven active products
       * were seeded in a single insert and carry a `created_at` identical to
       * the millisecond, so `ORDER BY created_at` alone is a six-way tie that
       * Postgres may resolve differently on any given plan — two reads of
       * this function minutes apart returned different first rows.
       *
       * Two things downstream read position as if it were meaningful: the
       * home page takes `products[0]` as the hero's lead figure, and
       * `bgClassName` is assigned by index below, so an unstable order
       * reshuffles every card's colour between renders as well as changing
       * which piece leads the page. Ordering on the primary key rather than
       * on `slug` keeps that stable even if a slug is later edited in
       * /admin. */
      .orderBy(asc(products.createdAt), asc(products.id)),
    // Run alongside the product query rather than after it — the badge
    // computation below needs both and neither depends on the other.
    getTopSellingProductIds(),
  ]);

  const bestsellerIds = new Set(topSellingIds.slice(0, BESTSELLER_BADGE_COUNT));

  const imageRows = rows.length
    ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, rows.map((r) => r.id)))
        .orderBy(asc(productImages.position))
    : [];

  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const row of imageRows) {
    const list = imagesByProduct.get(row.productId) ?? [];
    list.push({
      id: row.id,
      url: row.url,
      position: row.position,
      isPrimary: row.isPrimary,
      caption: row.caption ?? undefined,
      alt: row.alt ?? undefined,
    });
    imagesByProduct.set(row.productId, list);
  }

  return rows.map((row, i) => {
    const images = imagesByProduct.get(row.id) ?? [];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? undefined,
      priceCents: row.priceCents,
      category: row.category as ProductCategory,
      tag: computeAutoTag(row.createdAt, bestsellerIds.has(row.id)),
      dimensions: row.dimensions ?? undefined,
      materials: row.materials ?? undefined,
      careInstructions: row.careInstructions ?? undefined,
      bgClassName: BG_CYCLE_CLASSES[i % BG_CYCLE_CLASSES.length],
      placeholder: `product shot: ${row.name.toLowerCase()}`,
      stockQty: row.stockQty,
      images,
      primaryImageUrl: images.find((img) => img.isPrimary)?.url ?? images[0]?.url,
    };
  });
});

/** Full catalog — used by the Shop page and the Home page's sliding showcase.
 * Server-only: queries the live database directly, so this must not be imported
 * from a client component (import `./products` for the `Product` type,
 * `CATEGORIES`, and `formatPrice` instead). */
export async function getProducts(): Promise<Product[]> {
  return fetchActiveProducts();
}

/**
 * Active product ids ranked by units actually sold, best first.
 *
 * Reuses `REVENUE_STATUSES` rather than restating which statuses count as a
 * sale. That list is the one place this project decides what "sold" means —
 * `pending` is a checkout that reached the payment page and may never be paid,
 * and `cancelled` is the status that triggers a *restock*, so counting either
 * would rank a piece by orders that returned no money and no stock movement.
 * A second copy of that reasoning here is how the dashboard's revenue and the
 * storefront's "top sellers" quietly come to disagree about the same orders.
 *
 * Deliberately unlimited: the caller intersects this with the active catalogue
 * and takes what it needs. A `LIMIT 3` in SQL would return three ids that might
 * not all survive that intersection, leaving the caller short with no way to
 * ask for more. Ties break on the most recent sale, so the ordering is stable
 * across renders instead of depending on the planner.
 *
 * Wrapped in `cache()` — `fetchActiveProducts` now calls this too (for the
 * "Bestseller" badge), and the landing page's Top Sellers rail calls it
 * separately in the same request. Without the wrapper that's the query run
 * twice, same reasoning as `fetchActiveProducts`'s own cache() above.
 */
export const getTopSellingProductIds = cache(async (): Promise<string[]> => {
  const units = sql<string>`sum(${orderItems.quantity})`;
  const rows = await db
    .select({ productId: orderItems.productId })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(
      and(
        inArray(orders.status, [...REVENUE_STATUSES]),
        eq(products.status, "active"),
      ),
    )
    .groupBy(orderItems.productId)
    .orderBy(desc(units), desc(sql`max(${orders.paidAt})`));

  return rows.map((row) => row.productId);
});

/** Single active product by slug, for the product detail page
 * (`app/shop/[slug]/page.tsx`). Returns `null` if not found or not active,
 * so the caller can render a 404. Reuses the same bg/placeholder derivation
 * as the full catalog by finding the product's position within it, keeping
 * a product's card color consistent between the grid and its detail page. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await fetchActiveProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
