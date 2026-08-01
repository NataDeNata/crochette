import { and, eq, gt, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, products } from "@/lib/db/schema";
import { logError } from "@/lib/observability/log";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Decrements stock for every line item on an order, clamped at 0 (never
 * goes negative even if more was sold than was in stock). Auto-flips a
 * product from "active" to "sold_out" the moment its stock hits 0 — leaves
 * "draft" alone since that's an admin-owned state, not a stock signal.
 *
 * Checkout only *validates* stock; nothing is reserved between then and
 * confirmed payment, so two buyers can both pass validation on the last unit
 * and both pay. That is a real, accepted condition here — the money is already
 * taken by the time this runs, so refusing to fulfill is not an option and this
 * must not throw. What it must not do is stay silent: the `greatest(…, 0)`
 * clamp used to absorb the overshoot invisibly, leaving both orders `paid` with
 * nothing anywhere saying stock had been oversold. The guarded update below
 * makes the overshoot detectable, and the order still completes.
 */
export async function decrementStockForOrder(tx: Tx, orderId: string) {
  // Deterministic order. These updates take a row lock per product inside the
  // transaction, so two webhooks whose orders share products would deadlock if
  // each locked them in a different sequence — Postgres aborts one, which
  // becomes a 500 and a Xendit retry.
  const items = await tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.productId);

  for (const item of items) {
    // Guarded first: only succeeds when the stock is genuinely there.
    const affected = await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} - ${item.quantity}` })
      .where(and(eq(products.id, item.productId), gte(products.stockQty, item.quantity)))
      .returning({ id: products.id });

    if (affected.length === 0) {
      // Either the product row is gone, or it was oversold. Fall back to the
      // clamp so state stays consistent and the order still fulfills, but say
      // so — this is the signal that someone paid for stock that wasn't there.
      await tx
        .update(products)
        .set({ stockQty: sql`greatest(${products.stockQty} - ${item.quantity}, 0)` })
        .where(eq(products.id, item.productId));

      logError("inventory.oversold", new Error("stock decrement exceeded available quantity"), {
        orderId,
        productId: item.productId,
        detail: `order line wanted ${item.quantity} but stock was short; clamped to 0 and fulfilled anyway — payment is already taken, so this needs manual reconciliation`,
      });
    }

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
  // Same deterministic lock order as decrementStockForOrder — a restock and a
  // payment touching the same two products would otherwise deadlock.
  const items = await tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.productId);

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

/** A product is "running low" when it's still on sale and has fallen to or
 * below its own restock threshold, but isn't out yet. The three tiers —
 * healthy / low / sold out — deliberately never overlap, so each row carries
 * exactly one stock signal:
 *   - `stockQty > 0` excludes sold-out products, which already show a red
 *     quantity and a "sold out" status badge. "Low" means *restock soon*, not
 *     *too late*.
 *   - `status = 'active'` excludes both drafts (not for sale) and anything the
 *     admin manually parked at `sold_out` while it still has stock — that's a
 *     deliberate "not selling this right now" hold, not something to nag about.
 *   - A threshold of 0 disables the alert entirely, since `stockQty > 0` and
 *     `stockQty <= 0` can never both hold.
 *
 * This is the single source of truth: the dashboard count, the products-list
 * filter, and the per-row badge all derive from it (or from `isLowStock`
 * below) so they can't drift apart. Distinct from LOW_STOCK_THRESHOLD in
 * lib/data/products.ts, which is the customer-facing storefront badge. */
export const lowStockCondition = and(
  eq(products.status, "active"),
  gt(products.stockQty, 0),
  lte(products.stockQty, products.lowStockThreshold)
)!;

/** Row-level twin of `lowStockCondition`, for a row that's already been
 * fetched. Keep the two in lockstep — they encode the same rule. */
export function isLowStock(p: { status: string; stockQty: number; lowStockThreshold: number }): boolean {
  return p.status === "active" && p.stockQty > 0 && p.stockQty <= p.lowStockThreshold;
}
