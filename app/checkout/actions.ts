"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, orders, orderItems } from "@/lib/db/schema";
import { checkoutSchema } from "@/lib/validation/checkout";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { resolveCartId } from "@/lib/cart/resolve";
import { clearCart, getRawCartItems } from "@/lib/db/cart";
import { createPaymentSession } from "@/lib/payments/xendit";
import { resolveDiscountCode } from "@/lib/db/discounts";
import { auth } from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { logError, logWarn } from "@/lib/observability/log";
import type { FormActionState } from "@/lib/actions/types";

async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function submitCheckout(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const ip = await getClientIp();
  if (await isRateLimited("checkout", ip)) {
    return {
      status: "error",
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  const parsed = checkoutSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    shippingLine1: formData.get("shippingLine1"),
    shippingLine2: formData.get("shippingLine2") || undefined,
    shippingCity: formData.get("shippingCity"),
    shippingProvince: formData.get("shippingProvince"),
    shippingPostalCode: formData.get("shippingPostalCode"),
    discountCode: formData.get("discountCode") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // The cart is read from the DATABASE, not from the submitted form. It used to
  // arrive as a JSON blob in formData, which meant the server took the client's
  // word for which products and quantities were being bought — prices were
  // always recomputed server-side, but the line items themselves were not
  // verified. Now the client cannot influence what is purchased at all.
  const cartId = await resolveCartId({ create: false });
  const cart = cartId ? await getRawCartItems(cartId) : [];

  if (cart.length === 0) {
    logWarn("checkout.empty_cart", { hasCart: Boolean(cartId) });
    return {
      status: "error",
      message: "Your cart is empty. Please add something before checking out.",
    };
  }

  // Never trust client-sent price/name — re-fetch live product data and recompute.
  const productIds = cart.map((item) => item.productId);
  const liveProducts = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(liveProducts.map((p) => [p.id, p]));

  const lineItems: { productId: string; name: string; unitPriceCents: number; quantity: number }[] = [];
  for (const item of cart) {
    const product = productById.get(item.productId);
    if (!product || product.status !== "active") {
      return {
        status: "error",
        message: "One or more items in your cart are no longer available. Please review your cart and try again.",
      };
    }
    if (item.quantity > product.stockQty) {
      return {
        status: "error",
        message:
          product.stockQty > 0
            ? `Only ${product.stockQty} of "${product.name}" left in stock. Please update the quantity in your cart.`
            : `"${product.name}" just sold out. Please remove it from your cart.`,
      };
    }
    lineItems.push({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    });
  }

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const { discount, error: discountError } = await resolveDiscountCode(parsed.data.discountCode ?? "", subtotalCents);
  if (discountError) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: { discountCode: [discountError] },
    };
  }

  const discountCents = discount?.discountCents ?? 0;
  const totalCents = subtotalCents + SHIPPING_CENTS - discountCents;

  // Links the order to the account when logged in — guest checkout (no
  // session, or an admin session) leaves this null, unaffected either way.
  const authSession = await auth();
  const customerId = authSession?.user?.role === "customer" ? authSession.user.id : null;

  const [order] = await db
    .insert(orders)
    .values({
      customerId,
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone || null,
      shippingLine1: parsed.data.shippingLine1,
      shippingLine2: parsed.data.shippingLine2 || null,
      shippingCity: parsed.data.shippingCity,
      shippingProvince: parsed.data.shippingProvince,
      shippingPostalCode: parsed.data.shippingPostalCode,
      subtotalCents,
      shippingCents: SHIPPING_CENTS,
      discountCents,
      discountCodeId: discount?.id ?? null,
      totalCents,
      status: "pending",
    })
    .returning();

  await db.insert(orderItems).values(
    lineItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.name,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
    }))
  );

  const origin = await getSiteOrigin();

  let session;
  try {
    session = await createPaymentSession({
      referenceId: order.id,
      amountCents: totalCents,
      items: [
        ...lineItems.map((item) => ({ name: item.name, amountCents: item.unitPriceCents, quantity: item.quantity })),
        { name: "Shipping", amountCents: SHIPPING_CENTS, quantity: 1 },
        ...(discountCents > 0 ? [{ name: `Discount (${parsed.data.discountCode?.trim().toUpperCase()})`, amountCents: -discountCents, quantity: 1 }] : []),
      ],
      customer: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || undefined },
      successUrl: `${origin}/order/${order.id}`,
      cancelUrl: `${origin}/cart`,
    });
  } catch (err) {
    // orderId correlates the log line with the orders row this then marks
    // "failed" — currently the only durable artifact of a failure anywhere in
    // the app. Customer name/email/phone are in scope here and deliberately
    // not logged.
    logError("checkout.payment_session_failed", err, {
      orderId: order.id,
      totalCents,
      itemCount: lineItems.length,
    });
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return {
      status: "error",
      message: "We couldn't start checkout right now. Please try again in a moment.",
    };
  }

  await db.update(orders).set({ xenditPaymentSessionId: session.id }).where(eq(orders.id, order.id));

  // Emptied only once the payment session actually exists. Clearing any earlier
  // would lose the cart if Xendit failed above, stranding the customer with
  // nothing to retry from. The order row already records the line items, so a
  // failed payment can still be resumed from /order/[id].
  if (cartId) await clearCart(cartId);

  redirect(session.paymentLinkUrl);
}
