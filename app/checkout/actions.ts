"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, orders, orderItems, cartItems } from "@/lib/db/schema";
import { CHECKOUT_FIELDS, checkoutSchema } from "@/lib/validation/checkout";
import { SHIPPING_CENTS } from "@/lib/cart/constants";
import { resolveCartId } from "@/lib/cart/resolve";
import { clearCart, getRawCartItems } from "@/lib/db/cart";
import { createPaymentSession } from "@/lib/payments/xendit";
import { resolveDiscountCode } from "@/lib/db/discounts";
import { currentCustomerId } from "@/lib/auth-guard";
import { SITE_URL } from "@/lib/site";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { logError, logWarn } from "@/lib/observability/log";
import { fieldError, invalidFields, rateLimited, type FormActionState } from "@/lib/actions/types";

/**
 * The origin Xendit sends the shopper back to, after paying or cancelling.
 *
 * This used to be built from the `Host` header alone, which was wrong in two
 * ways. The header is client-supplied, so a request carrying a forged `Host`
 * put an attacker-chosen origin into a URL the payment provider then redirects
 * a *paying customer* to. And it made this a second source of truth for the
 * site origin, one that does not look like configuration — so the custom-domain
 * switch that is currently gating go-live would have needed an edit here that
 * nothing would have pointed at.
 *
 * The header is still used where it genuinely varies and no attacker is
 * involved: local dev on an arbitrary port, and the ngrok tunnel that webhook
 * testing needs (ngrok rewrites `Host`, which is the whole reason `AUTH_URL`
 * exists — see update.md). Everywhere else the origin comes from a value the
 * platform sets, never from the request:
 *
 * - production → `SITE_URL`, the same constant metadataBase, robots.ts,
 *   sitemap.ts and the outbound emails already use.
 * - preview → `VERCEL_URL`, because a preview deployment genuinely lives on its
 *   own hostname and bouncing its checkout to production would land the shopper
 *   on an order page that does not have their order.
 *
 * **Plain `http://localhost` can never complete a checkout, and that is Xendit's
 * rule, not ours.** Session creation rejects a non-HTTPS return URL outright:
 * `400 {"message":"Please provide a valid HTTPS URL","error_code":"INVALID_URL"}`.
 * Confirmed against the live test API on 2026-08-17. So a dev browsing on
 * localhost with no tunnel gets "We couldn't start checkout right now" no matter
 * what else is correct — which is a confusing place to debug from, because every
 * other part of the flow works and the message suggests a transient fault.
 *
 * `AUTH_URL` is therefore preferred in dev when it is set. It already exists to
 * hold the public tunnel origin for exactly this situation (Auth.js needs it
 * because ngrok rewrites `Host` — see update.md), so when you are tunnelling it
 * is the one value in the environment that names a reachable HTTPS origin. That
 * makes checkout work while browsing on localhost, instead of only when browsing
 * through the tunnel itself.
 */
async function getSiteOrigin(): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    // Set while tunnel-testing; the only HTTPS origin available in dev.
    const tunnel = process.env.AUTH_URL?.trim();
    if (tunnel?.startsWith("https://")) return tunnel.replace(/\/$/, "");

    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
  }

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return SITE_URL;
}

export async function submitCheckout(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  /* Everything the shopper typed, carried on every error return.
   *
   * React 19 resets an uncontrolled form once its action returns, so without
   * this a rejected checkout empties nine fields — including the address —
   * and asks the shopper to retype all of it to correct one. See
   * `FormActionState.values`. Read straight off the FormData rather than from
   * the parsed data, because the whole point is to survive a parse that
   * failed. */
  const echo = Object.fromEntries(
    CHECKOUT_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  );

  const ip = await getClientIp();
  if (await isRateLimited("checkout", ip)) return rateLimited({ values: echo });

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

  if (!parsed.success) return invalidFields(parsed.error, { values: echo });

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
      values: echo,
    };
  }

  // Never trust client-sent price/name — re-fetch live product data and recompute.
  const productIds = cart.map((item) => item.productId);
  const liveProducts = await db.select().from(products).where(inArray(products.id, productIds));
  const productById = new Map(liveProducts.map((p) => [p.id, p]));

  /* A line whose product is gone or no longer `active` is PRUNED, not refused.
   *
   * This used to return "One or more items in your cart are no longer available.
   * Please review your cart and try again." — and that was an unrecoverable dead
   * end, because the two paths disagree about the same cart. `getCartView`, which
   * renders /cart, filters on `status = 'active'` (lib/db/cart.ts), so the
   * offending line is INVISIBLE to the shopper. Checkout read it through
   * `getRawCartItems`, which deliberately does not filter, and refused. So the
   * cart looked completely fine, the error named nothing, "review your cart"
   * showed nothing to review, and there was no action in the UI that could clear
   * it. That cart could never check out again.
   *
   * Found live on 2026-08-17: an account cart holding 2x a product an admin had
   * parked at `sold_out` weeks earlier. Nothing about it was exotic — parking a
   * product in /admin is the documented way to hide one, and any cart already
   * containing it is bricked from that moment.
   *
   * Pruning rather than naming-and-refusing, because there is nothing honest to
   * ask for: the shopper cannot remove a row they cannot see, and they never
   * chose to add a product that has since been withdrawn. Deleting the line
   * reconciles the cart to what the shopper is already being shown, which is the
   * same direction as the store's optimistic-then-authoritative rule — the
   * server owns the cart and the client's view is corrected to match it.
   *
   * This is NOT the stock check below, and the two must not be merged. Stock is
   * about quantity and is refused loudly with a per-product message, because
   * silently charging for 2 when someone asked for 5 is a wrong charge. An
   * unpurchasable product has no correct quantity to charge for at all.
   *
   * The root cause is the read/write split above; the deeper fix is for /cart to
   * SHOW an unavailable line as unavailable instead of hiding it. Until then this
   * keeps the state self-healing rather than permanent. */
  const lineItems: { productId: string; name: string; unitPriceCents: number; quantity: number }[] = [];
  const prunedProductIds: string[] = [];
  for (const item of cart) {
    const product = productById.get(item.productId);
    if (!product || product.status !== "active") {
      prunedProductIds.push(item.productId);
      continue;
    }
    if (item.quantity > product.stockQty) {
      return {
        status: "error",
        message:
          product.stockQty > 0
            ? `Only ${product.stockQty} of "${product.name}" left in stock. Please update the quantity in your cart.`
            : `"${product.name}" just sold out. Please remove it from your cart.`,
        values: echo,
      };
    }
    lineItems.push({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    });
  }

  /* Delete the pruned lines, so the cart stops carrying rows nothing can buy.
   *
   * Before the order is created, not after: if the payment session fails below,
   * the shopper retries against a cart that is already clean rather than one that
   * re-prunes every attempt. The log line is the only record that anything was
   * dropped — it is deliberately `warn` rather than `info`, because a shopper
   * reaching checkout with a withdrawn product in their cart means a product was
   * parked while it sat in someone's cart, and how often that happens is worth
   * being able to answer. */
  if (prunedProductIds.length > 0 && cartId) {
    logWarn("checkout.pruned_unavailable_lines", {
      cartId,
      // Joined, not the array: the log context takes scalars only (see
      // lib/observability/log.ts) so one field stays one greppable value.
      productIds: prunedProductIds.join(","),
      prunedCount: prunedProductIds.length,
      remainingLines: lineItems.length,
    });
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cartId), inArray(cartItems.productId, prunedProductIds)));
  }

  /* Every line was unpurchasable. Distinguished from the empty-cart case above:
   * that one had nothing in it, this one had things that all turned out to be
   * withdrawn, and telling someone their cart is empty right after they watched
   * it hold five items reads as data loss. The cart genuinely is empty now. */
  if (lineItems.length === 0) {
    return {
      status: "error",
      message:
        "Sorry, the items in your cart are no longer available and have been removed. Please choose something else.",
      values: echo,
    };
  }

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const { discount, error: discountError } = await resolveDiscountCode(parsed.data.discountCode ?? "", subtotalCents);
  if (discountError) return fieldError("discountCode", discountError, { values: echo });

  const discountCents = discount?.discountCents ?? 0;
  const totalCents = subtotalCents + SHIPPING_CENTS - discountCents;

  // Links the order to the account when logged in — guest checkout (no
  // session, or an admin session) leaves this null, unaffected either way.
  const customerId = await currentCustomerId();

  /* One transaction, because an order and its line items are one fact.
   *
   * These were two separate `db.insert` calls, so a failure between them left a
   * `pending` order carrying a total and no lines — a row that shows up in the
   * admin list and in the customers page's lifetime totals but cannot be read
   * as an order. Nothing else in this codebase writes two related rows
   * unwrapped (`applyOrderStatusChange`, the webhook and `mergeCarts` are all
   * transactional), so this was the exception rather than the pattern.
   *
   * The Xendit call stays *outside* it, deliberately. A network round trip
   * inside a transaction holds the row locks it took for the whole call, and
   * that is exactly the contention `applyOrderStatusChange` and the webhook
   * already contend for. The order existing before the payment session is also
   * what makes the failure path below recoverable: there is a row to mark
   * `failed`, and the line items are on it, so /order/[id] can still show what
   * was attempted. */
  const order = await db.transaction(async (tx) => {
    const [created] = await tx
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

    await tx.insert(orderItems).values(
      lineItems.map((item) => ({
        orderId: created.id,
        productId: item.productId,
        productName: item.name,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
      }))
    );

    return created;
  });

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
      values: echo,
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
