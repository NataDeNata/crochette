"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getOrderProductSlugs } from "@/lib/db/inventory";
import { applyOrderStatusChange, type OrderTransition } from "@/lib/db/orders";
import { orderUpdateSchema, orderBulkUpdateSchema } from "@/lib/validation/order-admin";
import { notifyOrderShipped, notifyOrderDelivered } from "@/lib/email/notifications";
import { requireAdmin } from "@/lib/auth-guard";
import type { FormActionState } from "@/lib/actions/types";
import { logError, logInfo } from "@/lib/observability/log";

/**
 * Everything that has to happen *after* a status change commits: cache
 * invalidation, and the two transition emails.
 *
 * Shared by the single-order form and the bulk action so neither can forget a
 * path. Emails fire after the transaction (mirroring the Xendit webhook's
 * "mutate, then email" ordering) and are gated on the *previous* status, which
 * is what stops re-saving the form unchanged from re-sending them.
 */
async function afterOrderTransition(id: string, t: OrderTransition): Promise<void> {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath(`/order/${id}`);

  if (t.restocked) {
    const slugs = await getOrderProductSlugs(id);
    revalidatePath("/");
    revalidatePath("/shop");
    for (const slug of slugs) revalidatePath(`/shop/${slug}`);
  }

  if (t.justShipped || t.justCompleted) {
    const [updated] = await db.select().from(orders).where(eq(orders.id, id));
    if (updated) {
      if (t.justShipped) await notifyOrderShipped(updated);
      if (t.justCompleted) await notifyOrderDelivered(updated);
    }
  }
}

export async function updateOrder(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireAdmin();

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

  let transition: OrderTransition;
  try {
    transition = await applyOrderStatusChange(id, parsed.data.status, {
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
    });
  } catch (err) {
    logError("admin.order.update_failed", err, { orderId: id, nextStatus: parsed.data.status });
    return { status: "error", message: "Couldn't save changes. Please try again." };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  await afterOrderTransition(id, transition);

  redirect("/admin/orders");
}

/**
 * Apply one status to every selected order.
 *
 * Per-order transactions rather than one transaction around the batch, and
 * that is deliberate. A batch-wide transaction would mean a single bad row
 * rolling back thirty good ones, and — worse — it would hold row locks on
 * every order in the batch for the whole run, against a webhook that needs
 * those same locks to mark orders paid. Each order therefore commits on its
 * own and a failure is counted, logged and reported rather than thrown.
 *
 * Sequential rather than `Promise.all`: the pool is small (Supabase's
 * connection cap is the recurring local-dev failure mode — see update.md), and
 * a bulk action is not on a latency-critical path.
 */
export async function bulkUpdateOrders(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const admin = await requireAdmin();

  const parsed = orderBulkUpdateSchema.safeParse({
    status: formData.get("status"),
    // Every checked row posts under the same name, so this is the whole
    // selection. `getAll` returns [] when nothing was ticked, and a File entry
    // (possible on a hand-built multipart POST) is dropped here rather than
    // reaching the uuid check as an object.
    orderIds: formData.getAll("orderIds").filter((v) => typeof v === "string"),
  });

  if (!parsed.success) {
    const issue = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: issue.orderIds?.[0] ?? issue.status?.[0] ?? "Please pick some orders and a status.",
    };
  }

  const { status } = parsed.data;
  // De-duplicated because the count in the success message is derived from this
  // list. The UI can't produce a repeat — a checkbox is either ticked or not —
  // but a hand-built POST can, and the second pass would be a no-op transition
  // that still incremented `updated`, reporting more orders changed than exist.
  const orderIds = [...new Set(parsed.data.orderIds)];

  // One pre-flight query so ids with no row are counted as missing rather than
  // silently absorbed by the per-order `found: false`, which is indistinguishable
  // from "already in that status".
  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(inArray(orders.id, orderIds));
  const known = new Set(existing.map((r) => r.id));

  let updated = 0;
  let restocked = 0;
  let failed = 0;
  let missing = 0;

  for (const id of orderIds) {
    if (!known.has(id)) {
      missing += 1;
      continue;
    }
    let transition: Awaited<ReturnType<typeof applyOrderStatusChange>>;
    try {
      transition = await applyOrderStatusChange(id, status);
    } catch (err) {
      failed += 1;
      logError("admin.order.bulk_update_failed", err, { orderId: id, nextStatus: status });
      continue;
    }

    if (!transition.found) {
      missing += 1;
      continue;
    }
    updated += 1;
    if (transition.restocked) restocked += 1;

    // Deliberately outside the transaction's try. Everything above has already
    // committed — stock restored, discount usage refunded — so a failure here
    // is not a failed update and must not be counted as one. Doing so would
    // report "N couldn't be updated" for orders that were, inviting a retry
    // that re-runs the transition against rows already in the target status.
    try {
      await afterOrderTransition(id, transition);
    } catch (err) {
      logError("admin.order.bulk_after_transition_failed", err, { orderId: id, nextStatus: status });
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  logInfo("admin.order.bulk_updated", {
    adminId: admin.id,
    nextStatus: status,
    requested: orderIds.length,
    updated,
    restocked,
    failed,
    missing,
  });

  const missingNote =
    missing > 0 ? ` ${missing} ${missing === 1 ? "order was" : "orders were"} already in that status or no longer exist.` : "";
  const failNote = failed > 0 ? ` ${failed} couldn't be updated.` : "";

  if (updated === 0) {
    // Distinguished because they call for different responses: a failure is
    // worth retrying, a selection that was already in the target status (or
    // deleted underneath you) is not, and "please try again" on the latter
    // sends the admin round a loop that cannot succeed.
    return {
      status: "error",
      message: failed > 0 ? `Nothing was updated.${failNote}` : `Nothing to update.${missingNote}`,
    };
  }

  const noun = updated === 1 ? "order" : "orders";
  const restockNote = restocked > 0 ? ` Stock was restored for ${restocked} paid ${restocked === 1 ? "order" : "orders"}.` : "";

  return {
    status: failed > 0 ? "error" : "success",
    message: `${updated} ${noun} marked ${status}.${restockNote}${missingNote}${failNote}`,
  };
}
