import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { orders } from "@/lib/db/schema";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const notifyOrderPaid = vi.fn(async (order: { id: string }, items: unknown[]) => {
  void order;
  void items;
});
vi.mock("@/lib/email/notifications", () => ({
  notifyOrderPaid: (order: { id: string }, items: unknown[]) => notifyOrderPaid(order, items),
}));

const { POST } = await import("@/app/api/webhooks/xendit/route");
const { testDb } = await import("../helpers/db");
const { makeDiscount, makeOrder, makeProduct, readDiscount, readOrder, readProduct } = await import(
  "../helpers/factories"
);

const TOKEN = "test-callback-token"; // matches .env.test

function webhookRequest(
  body: unknown,
  { token = TOKEN, raw }: { token?: string | null; raw?: string } = {}
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (token !== null) headers.set("x-callback-token", token);
  return new Request("https://crochette.test/api/webhooks/xendit", {
    method: "POST",
    headers,
    body: raw ?? JSON.stringify(body),
  });
}

function completedEvent(orderId: string, paymentId = "pay_test_123") {
  return {
    event: "payment_session.completed",
    data: { reference_id: orderId, status: "COMPLETED", payment_id: paymentId },
  };
}

/** An order in the state a real Xendit redirect leaves behind. */
async function pendingOrder(overrides: Parameters<typeof makeOrder>[0] = {}) {
  const product = await makeProduct({ stockQty: 10, priceCents: 120000 });
  const order = await makeOrder({
    status: "pending",
    items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    ...overrides,
  });
  return { order, product };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.XENDIT_WEBHOOK_TOKEN = TOKEN;
});

describe("authentication", () => {
  it("rejects a request with no callback token", async () => {
    const response = await POST(webhookRequest(completedEvent("irrelevant"), { token: null }));
    expect(response.status).toBe(400);
  });

  it("rejects a forged callback token", async () => {
    const response = await POST(webhookRequest(completedEvent("irrelevant"), { token: "wrong" }));
    expect(response.status).toBe(400);
  });

  it("rejects everything when the token is not configured at all", async () => {
    // Distinguishing this from a forged request is the point: a real
    // misconfiguration stops all fulfillment and must not read as attack noise.
    delete process.env.XENDIT_WEBHOOK_TOKEN;

    const response = await POST(webhookRequest(completedEvent("irrelevant")));

    expect(response.status).toBe(400);
  });

  it("does not touch the order when authentication fails", async () => {
    const { order } = await pendingOrder();

    await POST(webhookRequest(completedEvent(order.id), { token: "wrong" }));

    expect((await readOrder(order.id)).status).toBe("pending");
  });
});

describe("payload handling", () => {
  it("rejects a body that is not JSON", async () => {
    const response = await POST(webhookRequest(null, { raw: "not json at all" }));
    expect(response.status).toBe(400);
  });

  it("acknowledges an event it does not handle, without fulfilling anything", async () => {
    // Xendit never retries a 200, and we genuinely don't handle these — but an
    // upstream rename would stop fulfillment sitewide, hence the logged event.
    const { order } = await pendingOrder();

    const response = await POST(
      webhookRequest({ event: "payment_session.expired", data: { reference_id: order.id } })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect((await readOrder(order.id)).status).toBe("pending");
  });

  it("rejects a completed event with no reference_id", async () => {
    const response = await POST(
      webhookRequest({ event: "payment_session.completed", data: { status: "COMPLETED" } })
    );
    expect(response.status).toBe(400);
  });
});

describe("order lookup", () => {
  it("returns a terminal 400 for an unknown but well-formed order id", async () => {
    const response = await POST(webhookRequest(completedEvent("00000000-0000-4000-8000-000000000000")));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "order not found" });
  });

  it("returns 400, not 500, for a reference_id that isn't uuid-shaped", async () => {
    // The 2026-07-29 fix. orders.id is a uuid column, so Postgres raises 22P02
    // rather than returning zero rows; that used to 500, and Xendit retries a
    // 500, so a permanently-bad id retried forever. This is also the one place
    // the REAL wrapped error shape is exercised — the unit test synthesizes it.
    const response = await POST(webhookRequest(completedEvent("ord_does_not_exist_canary")));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "order not found" });
  });
});

describe("fulfillment", () => {
  it("marks the order paid and records the Xendit payment id", async () => {
    const { order } = await pendingOrder();

    const response = await POST(webhookRequest(completedEvent(order.id, "pay_abc")));

    expect(response.status).toBe(200);
    const after = await readOrder(order.id);
    expect(after.status).toBe("paid");
    expect(after.xenditPaymentId).toBe("pay_abc");
    expect(after.paidAt).toBeInstanceOf(Date);
  });

  it("decrements stock — the only place in the app that does", async () => {
    const { order, product } = await pendingOrder();

    await POST(webhookRequest(completedEvent(order.id)));

    expect((await readProduct(product.id)).stockQty).toBe(8);
  });

  it("flips a product to sold_out when the sale empties it", async () => {
    const product = await makeProduct({ stockQty: 2, status: "active" });
    const order = await makeOrder({
      status: "pending",
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await POST(webhookRequest(completedEvent(order.id)));

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 0, status: "sold_out" });
  });

  it("counts the discount redemption here, not at checkout", async () => {
    const code = await makeDiscount({ usedCount: 0, maxUses: 5 });
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      status: "pending",
      discountCodeId: code.id,
      discountCents: 20000,
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 1 }],
    });

    await POST(webhookRequest(completedEvent(order.id)));

    expect((await readDiscount(code.id)).usedCount).toBe(1);
  });

  it("sends the confirmation email with the order's line items", async () => {
    const { order } = await pendingOrder();

    await POST(webhookRequest(completedEvent(order.id)));

    expect(notifyOrderPaid).toHaveBeenCalledOnce();
    const [paidOrder, items] = notifyOrderPaid.mock.calls[0];
    expect(paidOrder.id).toBe(order.id);
    expect(items).toHaveLength(1);
  });
});

describe("idempotency", () => {
  it("is a no-op on redelivery — stock does not move twice", async () => {
    // Xendit retries, so this is the difference between selling 2 and selling 4.
    const { order, product } = await pendingOrder();

    const first = await POST(webhookRequest(completedEvent(order.id)));
    const second = await POST(webhookRequest(completedEvent(order.id)));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true });
    expect((await readProduct(product.id)).stockQty).toBe(8);
  });

  it("does not send the confirmation email twice", async () => {
    const { order } = await pendingOrder();

    await POST(webhookRequest(completedEvent(order.id)));
    await POST(webhookRequest(completedEvent(order.id)));

    expect(notifyOrderPaid).toHaveBeenCalledOnce();
  });

  it("does not count the discount twice", async () => {
    const code = await makeDiscount({ usedCount: 0, maxUses: 5 });
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      status: "pending",
      discountCodeId: code.id,
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 1 }],
    });

    await POST(webhookRequest(completedEvent(order.id)));
    await POST(webhookRequest(completedEvent(order.id)));

    expect((await readDiscount(code.id)).usedCount).toBe(1);
  });

  it("does not re-fulfil an order that is already past paid", async () => {
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      status: "shipped",
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await POST(webhookRequest(completedEvent(order.id)));

    // The UPDATE matches only `pending`, so nothing happens — including no stock
    // movement — and the order keeps its later status.
    expect((await readOrder(order.id)).status).toBe("shipped");
    expect((await readProduct(product.id)).stockQty).toBe(10);
  });

  it("survives two concurrent deliveries of the same payment", async () => {
    const { order, product } = await pendingOrder();

    const [a, b] = await Promise.all([
      POST(webhookRequest(completedEvent(order.id))),
      POST(webhookRequest(completedEvent(order.id))),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect((await readProduct(product.id)).stockQty).toBe(8);
    expect(notifyOrderPaid).toHaveBeenCalledOnce();
  });
});

describe("failure after commit", () => {
  it("still commits the order as paid when the confirmation email throws", async () => {
    // Documented open bug: the order is already paid, the request 500s, Xendit
    // retries, and the retry short-circuits on the idempotency fast path — so
    // the email is lost permanently. Pinned so a future fix (which needs a
    // fulfilledAt column) is a deliberate, visible change.
    const { order } = await pendingOrder();
    notifyOrderPaid.mockRejectedValue(new Error("Resend unavailable"));

    await expect(POST(webhookRequest(completedEvent(order.id)))).rejects.toThrow();

    expect((await readOrder(order.id)).status).toBe("paid");
  });

  it("acknowledges the retry without ever sending the lost email", async () => {
    const { order } = await pendingOrder();
    notifyOrderPaid.mockRejectedValueOnce(new Error("Resend unavailable"));

    await expect(POST(webhookRequest(completedEvent(order.id)))).rejects.toThrow();
    const retry = await POST(webhookRequest(completedEvent(order.id)));

    expect(retry.status).toBe(200);
    // Called once (the throwing attempt); the retry short-circuits before it.
    expect(notifyOrderPaid).toHaveBeenCalledOnce();
  });
});

describe("nothing leaks into the response", () => {
  it("returns a fixed body, never order or customer detail", async () => {
    const { order } = await pendingOrder();

    const response = await POST(webhookRequest(completedEvent(order.id)));
    const body = await response.text();

    expect(body).toBe(JSON.stringify({ received: true }));
    const [row] = await testDb.select().from(orders).where(eq(orders.id, order.id));
    expect(body).not.toContain(row.customerEmail);
  });
});
