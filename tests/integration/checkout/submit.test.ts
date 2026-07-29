import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { discountCodes, orderItems, orders, products as productsTable } from "@/lib/db/schema";

/** Thrown by the mocked `redirect`, mirroring how Next signals navigation. */
class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super("NEXT_REDIRECT");
    this.name = "RedirectSignal";
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "crochette.test" }),
}));

// Real limiter would need Upstash; the limit itself is not what this file tests.
const isRateLimited = vi.fn(async () => false);
vi.mock("@/lib/security/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => isRateLimited(...(args as [])),
  getClientIp: async () => "203.0.113.9",
}));

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));

const createPaymentSession = vi.fn();
vi.mock("@/lib/payments/xendit", () => ({
  createPaymentSession: (...args: unknown[]) => createPaymentSession(...(args as [])),
}));

// Which cart the request belongs to is resolved from a signed cookie and the
// session; that machinery has its own tests. Here it just names a cart.
const resolveCartId = vi.fn();
vi.mock("@/lib/cart/resolve", () => ({
  resolveCartId: (...args: unknown[]) => resolveCartId(...(args as [])),
}));

const { submitCheckout } = await import("@/app/checkout/actions");
const { addItem } = await import("@/lib/db/cart");
const { testDb } = await import("../helpers/db");
const { makeCart, makeCustomer, makeDiscount, makeProduct, readCartLines } = await import(
  "../helpers/factories"
);

const SHIPPING_CENTS = 10000;

function checkoutForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    name: "Nata",
    email: "buyer@example.test",
    shippingLine1: "12 Mabini Street",
    shippingCity: "Quezon City",
    shippingProvince: "Metro Manila",
    shippingPostalCode: "1100",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

/** Runs the action and returns the URL it redirected to, failing if it didn't. */
async function submitExpectingRedirect(form = checkoutForm()): Promise<string> {
  try {
    await submitCheckout({ status: "idle" }, form);
  } catch (err) {
    if (err instanceof RedirectSignal) return err.url;
    throw err;
  }
  throw new Error("submitCheckout returned instead of redirecting to the payment page");
}

async function onlyOrder() {
  const [order] = await testDb.select().from(orders);
  return order;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue(null);
  isRateLimited.mockResolvedValue(false);
  createPaymentSession.mockResolvedValue({
    id: "ps_test_123",
    paymentLinkUrl: "https://checkout.xendit.test/ps_test_123",
  });
});

describe("the cart comes from the database, never from the client", () => {
  it("prices the order from live product rows", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10, priceCents: 120000 });
    await addItem(cart.id, product.id, 2);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect();

    const order = await onlyOrder();
    expect(order.subtotalCents).toBe(240000);
    expect(order.shippingCents).toBe(SHIPPING_CENTS);
    expect(order.totalCents).toBe(250000);
  });

  it("ignores line items submitted in the form", async () => {
    // The form used to carry the cart as a JSON blob. Prices were always
    // recomputed, but the LINE ITEMS were taken on the client's word, so a
    // crafted payload could order things the shopper never added. It now sends
    // nothing, and anything extra must be inert.
    const cart = await makeCart();
    const real = await makeProduct({ stockQty: 10, priceCents: 38000 });
    const smuggled = await makeProduct({ stockQty: 10, priceCents: 120000 });
    await addItem(cart.id, real.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    const form = checkoutForm();
    form.set("cart", JSON.stringify([{ productId: smuggled.id, quantity: 5, priceCents: 1 }]));

    await submitExpectingRedirect(form);

    const order = await onlyOrder();
    const items = await testDb.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: real.id, unitPriceCents: 38000, quantity: 1 });
    expect(order.totalCents).toBe(38000 + SHIPPING_CENTS);
  });

  it("snapshots the product name and unit price onto the order line", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10, priceCents: 120000, name: "Milo the Bear" });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect();

    const [item] = await testDb.select().from(orderItems);
    expect(item).toMatchObject({ productName: "Milo the Bear", unitPriceCents: 120000 });
  });

  it("refuses an empty cart", async () => {
    const cart = await makeCart();
    resolveCartId.mockResolvedValue(cart.id);

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.status).toBe("error");
    expect(result.message).toContain("cart is empty");
    expect(await testDb.select().from(orders)).toHaveLength(0);
  });

  it("refuses when there is no cart at all", async () => {
    resolveCartId.mockResolvedValue(null);

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.status).toBe("error");
    expect(await testDb.select().from(orders)).toHaveLength(0);
  });
});

describe("stock and availability", () => {
  it("refuses rather than silently clamping when the cart wants more than is left", async () => {
    // Checkout reads the RAW cart rows, not the clamped view, precisely so this
    // refusal is reachable. Reading the view would quietly charge for 2 when 5
    // were asked for.
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10, name: "Milo the Bear" });
    await addItem(cart.id, product.id, 5);
    await testDb.update(productsTable).set({ stockQty: 2 }).where(eq(productsTable.id, product.id));
    resolveCartId.mockResolvedValue(cart.id);

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.status).toBe("error");
    expect(result.message).toContain("Only 2");
    expect(await testDb.select().from(orders)).toHaveLength(0);
  });

  it("tells the shopper when an item sold out outright", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 5, name: "Milo the Bear" });
    await addItem(cart.id, product.id, 1);
    await testDb.update(productsTable).set({ stockQty: 0 }).where(eq(productsTable.id, product.id));
    resolveCartId.mockResolvedValue(cart.id);

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.message).toContain("just sold out");
  });

  it("refuses when a product was drafted after it went into the cart", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    await testDb.update(productsTable).set({ status: "draft" }).where(eq(productsTable.id, product.id));
    resolveCartId.mockResolvedValue(cart.id);

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.status).toBe("error");
    expect(result.message).toContain("no longer available");
  });

  it("does not decrement stock — that only happens on confirmed payment", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 3);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect();

    const [after] = await testDb
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id));
    expect(after.stockQty).toBe(10);
  });
});

describe("discount codes", () => {
  it("subtracts a valid code from the total and records it on the order", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10, priceCents: 120000 });
    await addItem(cart.id, product.id, 1);
    const code = await makeDiscount({ code: "SUMMER25", type: "percentage", value: 25 });
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect(checkoutForm({ discountCode: "summer25" }));

    const order = await onlyOrder();
    expect(order.discountCents).toBe(30000);
    expect(order.discountCodeId).toBe(code.id);
    expect(order.totalCents).toBe(120000 + SHIPPING_CENTS - 30000);
  });

  it("does not count the redemption at checkout time", async () => {
    // usedCount only moves on confirmed payment, so an abandoned checkout can't
    // burn someone else's redemption.
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    const code = await makeDiscount({ code: "SUMMER25", usedCount: 0 });
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect(checkoutForm({ discountCode: "SUMMER25" }));

    const [after] = await testDb.select().from(discountCodes);
    expect(after.usedCount).toBe(0);
    expect(after.id).toBe(code.id);
  });

  it("returns a field error for an invalid code instead of creating the order", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    const result = await submitCheckout({ status: "idle" }, checkoutForm({ discountCode: "NOPE" }));

    expect(result.fieldErrors?.discountCode?.[0]).toContain("isn't valid");
    expect(await testDb.select().from(orders)).toHaveLength(0);
  });

  it("passes the discount to Xendit as a negative line item", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10, priceCents: 120000 });
    await addItem(cart.id, product.id, 1);
    await makeDiscount({ code: "SUMMER25", type: "percentage", value: 25 });
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect(checkoutForm({ discountCode: "SUMMER25" }));

    const [{ items, amountCents }] = createPaymentSession.mock.calls[0];
    expect(amountCents).toBe(100000);
    expect(items).toContainEqual({ name: "Discount (SUMMER25)", amountCents: -30000, quantity: 1 });
    expect(items).toContainEqual({ name: "Shipping", amountCents: SHIPPING_CENTS, quantity: 1 });
  });
});

describe("account linking", () => {
  it("links the order to a signed-in customer", async () => {
    const customer = await makeCustomer();
    const cart = await makeCart(customer.id);
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);
    auth.mockResolvedValue({ user: { id: customer.id, role: "customer" } });

    await submitExpectingRedirect();

    expect((await onlyOrder()).customerId).toBe(customer.id);
  });

  it("leaves customer_id null for a guest", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect();

    expect((await onlyOrder()).customerId).toBeNull();
  });

  it("treats an admin session as a guest", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);
    auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });

    await submitExpectingRedirect();

    expect((await onlyOrder()).customerId).toBeNull();
  });

  it("stores the shipping address as submitted, not from any saved address", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect(checkoutForm({ shippingCity: "Cebu City" }));

    expect(await onlyOrder()).toMatchObject({ shippingCity: "Cebu City" });
  });
});

describe("payment session lifecycle", () => {
  it("records the session id and redirects to the hosted checkout page", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    const url = await submitExpectingRedirect();

    expect(url).toBe("https://checkout.xendit.test/ps_test_123");
    expect((await onlyOrder()).xenditPaymentSessionId).toBe("ps_test_123");
  });

  it("passes the order id as the reference and absolute return URLs", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect();

    const order = await onlyOrder();
    const [args] = createPaymentSession.mock.calls[0];
    expect(args.referenceId).toBe(order.id);
    expect(args.successUrl).toBe(`https://crochette.test/order/${order.id}`);
    expect(args.cancelUrl).toBe("https://crochette.test/cart");
  });

  it("empties the cart only after the session exists", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);

    await submitExpectingRedirect();

    expect(await readCartLines(cart.id)).toHaveLength(0);
  });

  it("leaves the cart intact and marks the order failed when Xendit throws", async () => {
    // Clearing earlier would strand the shopper with nothing to retry from.
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    resolveCartId.mockResolvedValue(cart.id);
    createPaymentSession.mockRejectedValue(new Error("Xendit unavailable"));

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.status).toBe("error");
    expect(await readCartLines(cart.id)).toHaveLength(1);
    expect((await onlyOrder()).status).toBe("failed");
  });
});

describe("guards", () => {
  it("stops at the rate limiter before touching the database", async () => {
    isRateLimited.mockResolvedValue(true);
    resolveCartId.mockResolvedValue(null);

    const result = await submitCheckout({ status: "idle" }, checkoutForm());

    expect(result.status).toBe("error");
    expect(result.message).toContain("Too many attempts");
    expect(resolveCartId).not.toHaveBeenCalled();
    expect(await testDb.select().from(orders)).toHaveLength(0);
  });

  it("returns field errors for invalid input without creating an order", async () => {
    resolveCartId.mockResolvedValue(null);

    const result = await submitCheckout({ status: "idle" }, checkoutForm({ email: "not-an-email" }));

    expect(result.fieldErrors?.email).toBeDefined();
    expect(createPaymentSession).not.toHaveBeenCalled();
    expect(await testDb.select().from(orders)).toHaveLength(0);
  });
});
