import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, products } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Decrements stock for every line item on an order, clamped at 0 (never
 * goes negative even if more was sold than was in stock). Auto-flips a
 * product from "active" to "sold_out" the moment its stock hits 0 — leaves
 * "draft" alone since that's an admin-owned state, not a stock signal. */
export async function decrementStockForOrder(tx: Tx, orderId: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    await tx
      .update(products)
      .set({ stockQty: sql`greatest(${products.stockQty} - ${item.quantity}, 0)` })
      .where(eq(products.id, item.productId));

    await tx
      .update(products)
      .set({ status: "sold_out" })
      .where(sql`${products.id} = ${item.productId} and ${products.stockQty} = 0 and ${products.status} = 'active'`);
  }
}

/** Slugs of every product on an order — used to know which storefront pages
 * need revalidating after a stock change. */
export async function getOrderProductSlugs(orderId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: products.slug })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
  return rows.map((r) => r.slug);
}

/** Reverses decrementStockForOrder — used when a paid order is cancelled
 * (e.g. a refund), so the stock it had reserved goes back on the shelf.
 * Auto-flips "sold_out" back to "active" once stock is restored. */
export async function restoreStockForOrder(tx: Tx, orderId: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${item.quantity}` })
      .where(eq(products.id, item.productId));

    await tx
      .update(products)
      .set({ status: "active" })
      .where(sql`${products.id} = ${item.productId} and ${products.stockQty} > 0 and ${products.status} = 'sold_out'`);
  }
}
