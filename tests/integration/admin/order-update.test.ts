import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super("NEXT_REDIRECT");
    this.name = "RedirectSignal";
  }
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

const notifyOrderShipped = vi.fn(async () => {});
const notifyOrderDelivered = vi.fn(async () => {});
vi.mock("@/lib/email/notifications", () => ({
  notifyOrderShipped: (...args: unknown[]) => notifyOrderShipped(...(args as [])),
  notifyOrderDelivered: (...args: unknown[]) => notifyOrderDelivered(...(args as [])),
}));

const { updateOrder } = await import("@/app/admin/orders/actions");
const { makeDiscount, makeOrder, makeProduct, readDiscount, readOrder, readProduct } = await import(
  "../helpers/factories"
);

function updateForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

/** The action ends in `redirect()`, which throws. Swallow that so a test can
 * assert on what it committed. */
async function save(orderId: string, fields: Record<string, string>) {
  try {
    return await updateOrder(orderId, { status: "idle" }, updateForm(fields));
  } catch (err) {
    if (err instanceof RedirectSignal) return { redirectedTo: err.url };
    throw err;
  }
}

async function paidOrder(stockQty = 10) {
  const product = await makeProduct({ stockQty });
  const order = await makeOrder({
    status: "paid",
    items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
  });
  return { order, product };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saving", () => {
  it("returns the admin to the list rather than leaving them on the detail page", async () => {
    const { order } = await paidOrder();

    const result = await save(order.id, { status: "shipped" });

    expect(result).toEqual({ redirectedTo: "/admin/orders" });
  });

  it("rejects a status the admin is not allowed to set", async () => {
    const { order } = await paidOrder();

    const result = await updateOrder(order.id, { status: "idle" }, updateForm({ status: "paid" }));

    expect(result.status).toBe("error");
    expect((await readOrder(order.id)).status).toBe("paid");
  });

  it("stores carrier and tracking number", async () => {
    const { order } = await paidOrder();

    await save(order.id, { status: "shipped", carrier: "LBC", trackingNumber: "ABC123" });

    expect(await readOrder(order.id)).toMatchObject({ carrier: "LBC", trackingNumber: "ABC123" });
  });

  it("clears tracking fields left blank rather than storing empty strings", async () => {
    const { order } = await paidOrder();
    await save(order.id, { status: "shipped", carrier: "LBC", trackingNumber: "ABC123" });

    await save(order.id, { status: "shipped", carrier: "", trackingNumber: "" });

    expect(await readOrder(order.id)).toMatchObject({ carrier: null, trackingNumber: null });
  });
});

describe("transition emails", () => {
  it("emails the customer once on paid -> shipped and stamps shippedAt", async () => {
    const { order } = await paidOrder();

    await save(order.id, { status: "shipped", carrier: "LBC" });

    expect(notifyOrderShipped).toHaveBeenCalledOnce();
    expect((await readOrder(order.id)).shippedAt).toBeInstanceOf(Date);
  });

  it("does not resend or restamp when the same status is saved again", async () => {
    // Gating on the PREVIOUS status is what makes re-saving the form — to fix a
    // typo in a tracking number, say — safe.
    const { order } = await paidOrder();
    await save(order.id, { status: "shipped", trackingNumber: "ABC123" });
    const firstStamp = (await readOrder(order.id)).shippedAt;
    vi.clearAllMocks();

    await save(order.id, { status: "shipped", trackingNumber: "ABC124" });

    expect(notifyOrderShipped).not.toHaveBeenCalled();
    expect((await readOrder(order.id)).shippedAt?.getTime()).toBe(firstStamp?.getTime());
    expect((await readOrder(order.id)).trackingNumber).toBe("ABC124");
  });

  it("emails once on shipped -> completed and stamps completedAt", async () => {
    const { order } = await paidOrder();
    await save(order.id, { status: "shipped" });
    vi.clearAllMocks();

    await save(order.id, { status: "completed" });

    expect(notifyOrderDelivered).toHaveBeenCalledOnce();
    expect(notifyOrderShipped).not.toHaveBeenCalled();
    expect((await readOrder(order.id)).completedAt).toBeInstanceOf(Date);
  });

  it("sends no delivered email when an order skips straight from paid to completed", async () => {
    // The gate is `shipped -> completed`, so this transition deliberately does
    // not notify — pinned because it is easy to "fix" into a double send.
    const { order } = await paidOrder();

    await save(order.id, { status: "completed" });

    expect(notifyOrderDelivered).not.toHaveBeenCalled();
    expect((await readOrder(order.id)).status).toBe("completed");
  });

  it("sends nothing on a cancellation", async () => {
    const { order } = await paidOrder();

    await save(order.id, { status: "cancelled" });

    expect(notifyOrderShipped).not.toHaveBeenCalled();
    expect(notifyOrderDelivered).not.toHaveBeenCalled();
  });
});

describe("cancelling a paid order", () => {
  it("puts the stock back", async () => {
    const { order, product } = await paidOrder();
    const before = (await readProduct(product.id)).stockQty;

    await save(order.id, { status: "cancelled" });

    expect((await readProduct(product.id)).stockQty).toBe(before + 2);
  });

  it("flips a sold-out product back to active", async () => {
    const product = await makeProduct({ stockQty: 0, status: "sold_out" });
    const order = await makeOrder({
      status: "paid",
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await save(order.id, { status: "cancelled" });

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 2, status: "active" });
  });

  it("gives back the discount redemption too", async () => {
    const code = await makeDiscount({ usedCount: 1 });
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      status: "paid",
      discountCodeId: code.id,
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 1 }],
    });

    await save(order.id, { status: "cancelled" });

    expect((await readDiscount(code.id)).usedCount).toBe(0);
  });

  it("does not restock an order that was never paid", async () => {
    // Stock is only taken at confirmed payment, so a pending order never
    // reserved any to give back.
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      status: "pending",
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await save(order.id, { status: "cancelled" });

    expect((await readProduct(product.id)).stockQty).toBe(10);
  });

  it("does not restock twice when an already-shipped order is cancelled", async () => {
    const { order, product } = await paidOrder();
    await save(order.id, { status: "shipped" });
    const afterShip = (await readProduct(product.id)).stockQty;

    await save(order.id, { status: "cancelled" });

    expect((await readProduct(product.id)).stockQty).toBe(afterShip);
  });

  it("does not restock twice when cancel is submitted twice", async () => {
    const { order, product } = await paidOrder();

    await save(order.id, { status: "cancelled" });
    const afterFirst = (await readProduct(product.id)).stockQty;
    await save(order.id, { status: "cancelled" });

    expect((await readProduct(product.id)).stockQty).toBe(afterFirst);
  });
});
