import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { decrementStockForOrder, getOrderProductSlugs } from "@/lib/db/inventory";
import { incrementDiscountUsage } from "@/lib/db/discounts";
import { notifyOrderPaid } from "@/lib/email/notifications";

function isValidCallbackToken(received: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  // Xendit sends a static verification token back on every webhook request
  // (not an HMAC signature) — compare it against the token issued when the
  // webhook URL was registered in the Xendit dashboard.
  if (!isValidCallbackToken(req.headers.get("x-callback-token"))) {
    console.error("xendit webhook: invalid or missing x-callback-token");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: { event?: string; data?: { reference_id?: string; status?: string; payment_id?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (payload.event !== "payment_session.completed") {
    // Other events (e.g. payment_session.expired) — nothing to do yet.
    return NextResponse.json({ received: true });
  }

  const orderId = payload.data?.reference_id;
  if (!orderId) {
    return NextResponse.json({ error: "missing reference_id" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    console.error(`xendit webhook: no order found for reference_id ${orderId}`);
    return NextResponse.json({ error: "order not found" }, { status: 400 });
  }

  // Fast-path idempotency check — Xendit may retry webhook delivery.
  if (order.status === "paid") {
    return NextResponse.json({ received: true });
  }

  const updated = await db.transaction(async (tx) => {
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

  if (!updated) {
    // A concurrent/duplicate delivery already flipped this order to "paid".
    return NextResponse.json({ received: true });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  const slugs = await getOrderProductSlugs(orderId);
  revalidatePath("/");
  revalidatePath("/shop");
  for (const slug of slugs) revalidatePath(`/shop/${slug}`);

  await notifyOrderPaid(updated, items);

  return NextResponse.json({ received: true });
}
