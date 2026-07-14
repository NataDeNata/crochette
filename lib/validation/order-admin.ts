import { z } from "zod";

/** pending/paid are webhook-owned (set by the Xendit payment flow) — the
 * admin form only ever moves an order forward through fulfillment. */
export const orderUpdateSchema = z.object({
  status: z.enum(["shipped", "completed", "cancelled"]),
});
