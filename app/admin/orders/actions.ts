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
import { invalidFields, type FormActionState } from "@/lib/actions/types";
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

  if (!parsed.success) return invalidFields(parsed.error);

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

  // One pre-flight query, because `applyOrderStatusChange` cannot answer either
  // of the questions the success message needs. It reports `found: true` for any
  // row that exists (lib/db/orders.ts:88) — including one already in the target
  // status — so on its own it makes "changed" and "was already like that"
  // indistinguishable, and both get reported as changed. The current status is
  // read here so they can be told apart.
  const existing = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(inArray(orders.id, orderIds));
  const currentStatus = new Map(existing.map((r) => [r.id, r.status]));

  let updated = 0;
  let restocked = 0;
  let failed = 0;
  let missing = 0;
  let unchanged = 0;
  let notifyFailed = 0;

  for (const id of orderIds) {
    const before = currentStatus.get(id);
    if (before === undefined) {
      missing += 1;
      continue;
    }
    // Skipped rather than written: re-applying the status an order already has
    // is a no-op that still burns a transaction and a row lock, and counting it
    // as updated overstates what the admin actually did.
    if (before === status) {
      unchanged += 1;
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
    //
    // It still needs its own counter, though. This is where the "your order is
    // on its way" email is sent, and swallowing a failure silently means the
    // admin reads "20 orders marked shipped" while three customers were never
    // told. The status change stands; only the notification is in doubt, which
    // is what the message has to say.
    try {
      await afterOrderTransition(id, transition);
    } catch (err) {
      notifyFailed += 1;
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
    unchanged,
    notifyFailed,
  });

  // Kept as separate sentences rather than one merged "skipped" count: they are
  // four different things, and only two of them are worth doing anything about.
  const unchangedNote =
    unchanged > 0 ? ` ${unchanged} ${unchanged === 1 ? "was" : "were"} already ${status}.` : "";
  const missingNote =
    missing > 0 ? ` ${missing} ${missing === 1 ? "order no longer exists" : "orders no longer exist"}.` : "";
  const failNote = failed > 0 ? ` ${failed} couldn't be updated.` : "";
  const notifyNote =
    notifyFailed > 0
      ? ` ${notifyFailed} ${notifyFailed === 1 ? "customer" : "customers"} couldn't be emailed — the status change went through, but they weren't told.`
      : "";

  if (updated === 0) {
    // Distinguished because they call for different responses: a failure is
    // worth retrying, a selection that was already in the target status (or
    // deleted underneath you) is not, and "please try again" on the latter
    // sends the admin round a loop that cannot succeed.
    return {
      status: "error",
      message: failed > 0 ? `Nothing was updated.${failNote}` : `Nothing to update.${unchangedNote}${missingNote}`,
    };
  }

  const noun = updated === 1 ? "order" : "orders";
  const restockNote = restocked > 0 ? ` Stock was restored for ${restocked} paid ${restocked === 1 ? "order" : "orders"}.` : "";

  return {
    // An un-sent email is not a failed update, but it is not a clean success
    // either — the admin has to know to follow it up by hand.
    status: failed > 0 || notifyFailed > 0 ? "error" : "success",
    message: `${updated} ${noun} marked ${status}.${restockNote}${unchangedNote}${missingNote}${failNote}${notifyNote}`,
  };
}
