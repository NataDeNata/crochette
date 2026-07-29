import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { decrementStockForOrder, getOrderProductSlugs } from "@/lib/db/inventory";
import { incrementDiscountUsage } from "@/lib/db/discounts";
import { notifyOrderPaid } from "@/lib/email/notifications";
import { logError, logInfo, logWarn, flushTelemetry } from "@/lib/observability/log";

/**
 * Instrumented 2026-07-28. Every exit path now emits a distinct event, because
 * four of them previously returned an identical `{received:true}` body with no
 * log at all — "order marked paid", "duplicate delivery", and "event ignored"
 * were indistinguishable from each other in production.
 *
 * Control flow is deliberately UNCHANGED: every return still yields the same
 * status and body it did before. The known behavioural bugs this logging makes
 * visible (silent 200 on unknown event; the post-commit gap below) are recorded
 * in Cro_Documentation.md rather than fixed here — changing payment control flow
 * blind is how a rare bug becomes a common one.
 */

function isValidCallbackToken(received: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const rawBody = await req.text();

  // Xendit sends a static verification token back on every webhook request
  // (not an HMAC signature) — compare it against the token issued when the
  // webhook URL was registered in the Xendit dashboard.
  if (!isValidCallbackToken(req.headers.get("x-callback-token"))) {
    // A missing env var and a forged request used to produce the identical log
    // line, so a misconfiguration looked like an attack and would be dismissed
    // as noise. They're now separate events.
    if (!process.env.XENDIT_WEBHOOK_TOKEN) {
      logWarn("webhook.xendit.token_not_configured", {
        detail: "XENDIT_WEBHOOK_TOKEN is unset — every webhook is being rejected and no order can be marked paid",
      });
    } else {
      logWarn("webhook.xendit.auth_failed", {
        hasHeader: req.headers.get("x-callback-token") !== null,
        bodyBytes: rawBody.length,
      });
    }
    await flushTelemetry();
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: { event?: string; data?: { reference_id?: string; status?: string; payment_id?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    // Was a bare `catch {}` — a malformed payload left no trace whatsoever.
    logError("webhook.xendit.payload_parse_failed", err, { bodyBytes: rawBody.length });
    await flushTelemetry();
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const orderId = payload.data?.reference_id;

  if (payload.event !== "payment_session.completed") {
    // Other events (e.g. payment_session.expired) — nothing to do yet.
    // Xendit never retries a 200, so if this event name ever changes upstream,
    // fulfillment stops sitewide and silently. Keeping the 200 is correct (we
    // genuinely don't handle these), but it must at least be visible.
    logWarn("webhook.xendit.unknown_event", {
      xenditEvent: payload.event ?? "(none)",
      orderId: orderId ?? null,
    });
    await flushTelemetry();
    return NextResponse.json({ received: true });
  }

  if (!orderId) {
    logError("webhook.xendit.missing_reference_id", new Error("payload.data.reference_id absent"), {
      xenditEvent: payload.event,
    });
    await flushTelemetry();
    return NextResponse.json({ error: "missing reference_id" }, { status: 400 });
  }

  let order: typeof orders.$inferSelect | undefined;
  try {
    [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  } catch (err) {
    // `orders.id` is a uuid column, so a reference_id that isn't uuid-shaped
    // makes Postgres raise 22P02 (invalid input syntax) instead of returning
    // zero rows — which means the `order_not_found` 400 below is UNREACHABLE
    // for malformed ids, and the request 500s. Xendit retries a 500, so a
    // permanently-bad reference_id retries forever.
    //
    // Left as a 500 on purpose: this same catch also sees genuine DB outages,
    // where retrying IS correct, and telling the two apart by SQLSTATE is a
    // payment control-flow change. Recorded in Cro_Documentation.md §12.
    logError("webhook.xendit.order_lookup_failed", err, {
      orderId,
      detail:
        "order lookup threw instead of returning no rows; if this is SQLSTATE 22P02 the reference_id is not uuid-shaped and every Xendit retry will fail identically",
    });
    await flushTelemetry();
    throw err;
  }

  if (!order) {
    logError("webhook.xendit.order_not_found", new Error("no order for reference_id"), { orderId });
    await flushTelemetry();
    return NextResponse.json({ error: "order not found" }, { status: 400 });
  }

  // Fast-path idempotency check — Xendit may retry webhook delivery.
  if (order.status === "paid") {
    logInfo("webhook.xendit.duplicate_delivery", { orderId, path: "fast_path", orderStatus: order.status });
    await flushTelemetry();
    return NextResponse.json({ received: true });
  }

  let updated: typeof orders.$inferSelect | null;
  try {
    updated = await db.transaction(async (tx) => {
      // The WHERE clause (not just the id) is what makes this safe under
      // concurrent redelivery: Postgres takes a row lock as part of evaluating
      // the UPDATE's WHERE, so if two deliveries race, the second one blocks
      // until the first commits, then re-checks status and finds it's no
      // longer "pending" — matching zero rows instead of double-processing.
      const [row] = await tx
        .update(orders)
        .set({ status: "paid", paidAt: new Date(), xenditPaymentId: payload.data?.payment_id ?? null })
        .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
        .returning();

      if (!row) return null;

      // Stock is only ever decremented here, at confirmed payment — not at
      // checkout-creation (still pending) or admin fulfillment ("completed"),
      // so an abandoned/failed checkout never costs real inventory.
      await decrementStockForOrder(tx, orderId);

      // Same principle for discount-code usage — only counted once payment
      // actually goes through, not merely entered at checkout.
      if (row.discountCodeId) {
        await incrementDiscountUsage(tx, row.discountCodeId);
      }

      return row;
    });
  } catch (err) {
    // Rethrown so Next still returns 500 and Xendit still retries — that is the
    // correct behaviour and is unchanged. The only difference is that it's now
    // attributed to a named event instead of surfacing as an anonymous 500.
    logError("webhook.xendit.fulfillment_tx_failed", err, {
      orderId,
      previousStatus: order.status,
    });
    await flushTelemetry();
    throw err;
  }

  if (!updated) {
    // A concurrent/duplicate delivery already flipped this order to "paid".
    logInfo("webhook.xendit.duplicate_delivery", { orderId, path: "tx_race" });
    await flushTelemetry();
    return NextResponse.json({ received: true });
  }

  logInfo("webhook.xendit.order_paid", {
    orderId,
    totalCents: updated.totalCents,
    discountCodeId: updated.discountCodeId ?? null,
    ms: Date.now() - startedAt,
  });

  // Everything below runs AFTER the order is already committed as paid. A throw
  // here yields a 500, Xendit retries, the retry hits the fast-path idempotency
  // return above and short-circuits — so the customer's confirmation email is
  // never sent, permanently, with no trace. Guarding that properly is a
  // control-flow change (it needs a fulfilledAt column); logging it is not, and
  // this is the single highest-value capture in the file.
  try {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    const slugs = await getOrderProductSlugs(orderId);
    revalidatePath("/");
    revalidatePath("/shop");
    for (const slug of slugs) revalidatePath(`/shop/${slug}`);

    await notifyOrderPaid(updated, items);
  } catch (err) {
    logError("webhook.xendit.post_commit_failed", err, {
      orderId,
      detail:
        "order is COMMITTED as paid but fulfillment side-effects (revalidate + confirmation email) did not complete; Xendit's retry will hit the idempotency fast path and will NOT re-run them",
    });
    await flushTelemetry();
    throw err; // unchanged: still a 500, still retried
  }

  await flushTelemetry();
  return NextResponse.json({ received: true });
}
