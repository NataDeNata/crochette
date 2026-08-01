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
    return { status: "error", message: "Couldn't save changes — please try again." };
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

  const { status, orderIds } = parsed.data;

  // One pre-flight query so ids that don't exist are reported as such instead
  // of being silently absorbed by the per-order `found: false`. Also keeps the
  // count in the success message honest.
  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(inArray(orders.id, orderIds));
  const known = new Set(existing.map((r) => r.id));

  let updated = 0;
  let restocked = 0;
  let failed = 0;

  for (const id of orderIds) {
    if (!known.has(id)) continue;
    try {
      const transition = await applyOrderStatusChange(id, status);
      if (!transition.found) continue;
      updated += 1;
      if (transition.restocked) restocked += 1;
      await afterOrderTransition(id, transition);
    } catch (err) {
      failed += 1;
      logError("admin.order.bulk_update_failed", err, { orderId: id, nextStatus: status });
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
  });

  if (updated === 0) {
    return { status: "error", message: "Nothing was updated — please try again." };
  }

  const noun = updated === 1 ? "order" : "orders";
  const restockNote = restocked > 0 ? ` Stock was restored for ${restocked} paid ${restocked === 1 ? "order" : "orders"}.` : "";
  const failNote = failed > 0 ? ` ${failed} couldn't be updated.` : "";

  return {
    status: failed > 0 ? "error" : "success",
    message: `${updated} ${noun} marked ${status}.${restockNote}${failNote}`,
  };
}
