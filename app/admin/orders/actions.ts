"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { restoreStockForOrder, getOrderProductSlugs } from "@/lib/db/inventory";
import { decrementDiscountUsage } from "@/lib/db/discounts";
import { orderUpdateSchema } from "@/lib/validation/order-admin";
import { notifyOrderShipped, notifyOrderDelivered } from "@/lib/email/notifications";
import type { FormActionState } from "@/lib/actions/types";

export async function updateOrder(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = orderUpdateSchema.safeParse({
    status: formData.get("status"),
    trackingNumber: formData.get("trackingNumber") || undefined,
    carrier: formData.get("carrier") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let restocked = false;
  let justShipped = false;
  let justCompleted = false;
  try {
    await db.transaction(async (tx) => {
      // `FOR UPDATE` takes a row lock immediately, so if two cancel
      // requests for the same order race, the second one blocks until the
      // first commits, then re-reads the row's now-updated status — seeing
      // it's no longer "paid" and correctly skipping a second restock.
      const [existing] = await tx
        .select({ status: orders.status, discountCodeId: orders.discountCodeId })
        .from(orders)
        .where(eq(orders.id, id))
        .for("update");

      // Tracking number/carrier are editable any time, independent of
      // status — the admin can fix a typo later without re-triggering an
      // email, since the email fires off the status *transition* below,
      // not off these fields changing.
      justShipped = existing?.status === "paid" && parsed.data.status === "shipped";
      justCompleted = existing?.status === "shipped" && parsed.data.status === "completed";

      await tx
        .update(orders)
        .set({
          status: parsed.data.status,
          trackingNumber: parsed.data.trackingNumber || null,
          carrier: parsed.data.carrier || null,
          ...(justShipped ? { shippedAt: new Date() } : {}),
          ...(justCompleted ? { completedAt: new Date() } : {}),
        })
        .where(eq(orders.id, id));

      // Stock was decremented when the order was marked "paid" (webhook) —
      // cancelling a paid order (e.g. a refund) is the one admin-driven
      // transition that needs to give that stock (and any discount-code
      // redemption it used) back.
      if (existing?.status === "paid" && parsed.data.status === "cancelled") {
        await restoreStockForOrder(tx, id);
        if (existing.discountCodeId) {
          await decrementDiscountUsage(tx, existing.discountCodeId);
        }
        restocked = true;
      }
    });
  } catch (err) {
    console.error("updateOrder failed:", err);
    return { status: "error", message: "Couldn't save changes — please try again." };
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath(`/order/${id}`);

  if (restocked) {
    const slugs = await getOrderProductSlugs(id);
    revalidatePath("/");
    revalidatePath("/shop");
    for (const slug of slugs) revalidatePath(`/shop/${slug}`);
  }

  // Fired after the transaction commits (mirroring the Xendit webhook's
  // "mutate, then email" ordering) — gated on the *previous* status, so
  // re-saving the form without changing status never re-sends either email.
  if (justShipped || justCompleted) {
    const [updated] = await db.select().from(orders).where(eq(orders.id, id));
    if (updated) {
      if (justShipped) await notifyOrderShipped(updated);
      if (justCompleted) await notifyOrderDelivered(updated);
    }
  }

  return { status: "success", message: "Saved." };
}
