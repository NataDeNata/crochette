"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, orders, orderItems } from "@/lib/db/schema";
import { checkoutSchema, cartPayloadSchema } from "@/lib/validation/checkout";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { createPaymentSession } from "@/lib/payments/xendit";
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
  const parsed = checkoutSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    shippingLine1: formData.get("shippingLine1"),
    shippingLine2: formData.get("shippingLine2") || undefined,
    shippingCity: formData.get("shippingCity"),
    shippingProvince: formData.get("shippingProvince"),
    shippingPostalCode: formData.get("shippingPostalCode"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let cart;
  try {
    cart = cartPayloadSchema.parse(JSON.parse(String(formData.get("cart") || "[]")));
  } catch {
    return {
      status: "error",
      message: "Your cart looks empty or invalid — please go back to your cart and try again.",
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
            ? `Only ${product.stockQty} of "${product.name}" left in stock — please update the quantity in your cart.`
            : `"${product.name}" just sold out — please remove it from your cart.`,
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
  const totalCents = subtotalCents + SHIPPING_CENTS;

  const [order] = await db
    .insert(orders)
    .values({
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
      ],
      customer: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || undefined },
      successUrl: `${origin}/order/${order.id}`,
      cancelUrl: `${origin}/cart`,
    });
  } catch (err) {
    console.error("createPaymentSession failed:", err);
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return {
      status: "error",
      message: "We couldn't start checkout right now — please try again in a moment.",
    };
  }

  await db.update(orders).set({ xenditPaymentSessionId: session.id }).where(eq(orders.id, order.id));

  redirect(session.paymentLinkUrl);
}
