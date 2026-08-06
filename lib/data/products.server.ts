import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import type { Product, ProductCategory, ProductImage } from "./products";
import { BG_CYCLE_CLASSES } from "./bg-cycle";

/** `bg`/`placeholder` are the pre-photography fallback — derived here the
 * same way the old mock catalog derived them, and still used whenever a
 * product has zero uploaded images. */
async function fetchActiveProducts(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(asc(products.createdAt));

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
      tag: row.tag ?? undefined,
      bgClassName: BG_CYCLE_CLASSES[i % BG_CYCLE_CLASSES.length],
      placeholder: `product shot: ${row.name.toLowerCase()}`,
      stockQty: row.stockQty,
      images,
      primaryImageUrl: images.find((img) => img.isPrimary)?.url ?? images[0]?.url,
    };
  });
}

/** Full catalog — used by the Shop page and the Home page's sliding showcase.
 * Server-only: queries the live database directly, so this must not be imported
 * from a client component (import `./products` for the `Product` type,
 * `CATEGORIES`, and `formatPrice` instead). */
export async function getProducts(): Promise<Product[]> {
  return fetchActiveProducts();
}

/** Single active product by slug, for the product detail page
 * (`app/shop/[slug]/page.tsx`). Returns `null` if not found or not active,
 * so the caller can render a 404. Reuses the same bg/placeholder derivation
 * as the full catalog by finding the product's position within it, keeping
 * a product's card color consistent between the grid and its detail page. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await fetchActiveProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
