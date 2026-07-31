import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { restoreStockForOrder } from "@/lib/db/inventory";
import { decrementDiscountUsage } from "@/lib/db/discounts";

/** The three statuses an admin may set. `pending`/`paid` are webhook-owned —
 * see lib/validation/order-admin.ts, which enforces the same set on the form. */
export type OrderAdminStatus = "shipped" | "completed" | "cancelled";

/** What the transition actually did, so the caller can decide what to
 * revalidate and which email to send *after* the transaction commits. */
export type OrderTransition = {
  /** False when no order with that id exists — a bulk caller reports it as a
   * skip rather than failing the whole batch. */
  found: boolean;
  /** paid → shipped. The only transition that sends the "on its way" email. */
  justShipped: boolean;
  /** shipped → completed. Sends the delivered email. */
  justCompleted: boolean;
  /** paid → cancelled, so stock and any discount redemption were given back
   * and the storefront's stock counts are now stale. */
  restocked: boolean;
};

/**
 * Move one order to a new admin status, inside a transaction.
 *
 * Extracted from `updateOrder` on 2026-07-31 so the bulk action on the orders
 * list runs the *same* code rather than a second, simpler implementation.
 * Everything subtle here — the row lock, the restock-on-cancel, gating the
 * emails on the previous status — has to hold for a bulk change too, and a
 * parallel implementation is exactly how those quietly drift apart.
 *
 * `fields` is omitted entirely by the bulk caller: tracking number and carrier
 * are per-order, so a bulk "mark shipped" must leave whatever is already there
 * untouched. Passing them (as the single-order form does) writes both, empty
 * string included, which is how a typo gets cleared.
 */
export async function applyOrderStatusChange(
  id: string,
  status: OrderAdminStatus,
  fields?: { trackingNumber?: string; carrier?: string },
): Promise<OrderTransition> {
  let result: OrderTransition = { found: false, justShipped: false, justCompleted: false, restocked: false };

  await db.transaction(async (tx) => {
    // `FOR UPDATE` takes a row lock immediately, so if two cancel requests for
    // the same order race, the second one blocks until the first commits, then
    // re-reads the row's now-updated status — seeing it's no longer "paid" and
    // correctly skipping a second restock. This matters more with bulk actions
    // than it did before: the same order can now be in a batch *and* be edited
    // on its detail page at the same time.
    const [existing] = await tx
      .select({ status: orders.status, discountCodeId: orders.discountCodeId })
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");

    if (!existing) return;

    const justShipped = existing.status === "paid" && status === "shipped";
    const justCompleted = existing.status === "shipped" && status === "completed";

    await tx
      .update(orders)
      .set({
        status,
        ...(fields ? { trackingNumber: fields.trackingNumber || null, carrier: fields.carrier || null } : {}),
        ...(justShipped ? { shippedAt: new Date() } : {}),
        ...(justCompleted ? { completedAt: new Date() } : {}),
      })
      .where(eq(orders.id, id));

    // Stock was decremented when the order was marked "paid" (webhook) —
    // cancelling a paid order (e.g. a refund) is the one admin-driven
    // transition that needs to give that stock (and any discount-code
    // redemption it used) back.
    let restocked = false;
    if (existing.status === "paid" && status === "cancelled") {
      await restoreStockForOrder(tx, id);
      if (existing.discountCodeId) {
        await decrementDiscountUsage(tx, existing.discountCodeId);
      }
      restocked = true;
    }

    result = { found: true, justShipped, justCompleted, restocked };
  });

  return result;
}
