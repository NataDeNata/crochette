import { z } from "zod";

/** pending/paid are webhook-owned (set by the Xendit payment flow) — the
 * admin form only ever moves an order forward through fulfillment. */
export const ORDER_ADMIN_STATUSES = ["shipped", "completed", "cancelled"] as const;

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_ADMIN_STATUSES),
  trackingNumber: z.string().trim().max(100).optional().or(z.literal("")),
  carrier: z.string().trim().max(60).optional().or(z.literal("")),
});

/** The bulk action on the orders list. Same status set as the single-order
 * form above — a bulk change is not a way to reach a transition the detail
 * page refuses.
 *
 * `orderIds` are parsed as uuids rather than trusted strings: they arrive as
 * checkbox values, which a direct POST controls entirely, and they go straight
 * into a `WHERE id IN (…)`. The cap is a guard against a single request
 * fanning out into an unbounded number of transactions (and, at "shipped", an
 * unbounded number of emails) — the list pages 20 at a time, so it is well
 * clear of any real selection. */
export const orderBulkUpdateSchema = z.object({
  status: z.enum(ORDER_ADMIN_STATUSES),
  orderIds: z
    .array(z.uuid())
    .min(1, "Select at least one order.")
    .max(100, "Too many orders selected at once — please do it in smaller batches."),
});
