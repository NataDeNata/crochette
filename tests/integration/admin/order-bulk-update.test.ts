import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: async () => ({ id: "00000000-0000-0000-0000-0000000000ad", email: "admin@example.com" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const notifyOrderShipped = vi.fn(async () => {});
const notifyOrderDelivered = vi.fn(async () => {});
vi.mock("@/lib/email/notifications", () => ({
  notifyOrderShipped: (...args: unknown[]) => notifyOrderShipped(...(args as [])),
  notifyOrderDelivered: (...args: unknown[]) => notifyOrderDelivered(...(args as [])),
}));

const { bulkUpdateOrders } = await import("@/app/admin/orders/actions");
const { makeDiscount, makeOrder, makeProduct, readDiscount, readOrder, readProduct } = await import(
  "../helpers/factories"
);

function bulkForm(status: string, orderIds: string[]): FormData {
  const fd = new FormData();
  fd.set("status", status);
  for (const id of orderIds) fd.append("orderIds", id);
  return fd;
}

async function apply(status: string, orderIds: string[]) {
  return bulkUpdateOrders({ status: "idle" }, bulkForm(status, orderIds));
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The bulk path shares `applyOrderStatusChange` with the single-order form, so
 * these do not re-test the transition rules — `order-update.test.ts` owns
 * those. What is tested here is what only the bulk path can get wrong: applying
 * to the right set, per-order isolation, and not fanning out side effects.
 */
describe("bulk order updates", () => {
  it("applies the status to every selected order", async () => {
    const a = await makeOrder({ status: "paid" });
    const b = await makeOrder({ status: "paid" });

    const result = await apply("shipped", [a.id, b.id]);

    expect(result.status).toBe("success");
    expect((await readOrder(a.id)).status).toBe("shipped");
    expect((await readOrder(b.id)).status).toBe("shipped");
  });

  it("leaves orders that were not selected alone", async () => {
    const selected = await makeOrder({ status: "paid" });
    const untouched = await makeOrder({ status: "paid" });

    await apply("shipped", [selected.id]);

    expect((await readOrder(untouched.id)).status).toBe("paid");
  });

  it("stamps shippedAt and emails once per order, not once per batch", async () => {
    const a = await makeOrder({ status: "paid" });
    const b = await makeOrder({ status: "paid" });

    await apply("shipped", [a.id, b.id]);

    expect(notifyOrderShipped).toHaveBeenCalledTimes(2);
    expect((await readOrder(a.id)).shippedAt).toBeInstanceOf(Date);
    expect((await readOrder(b.id)).shippedAt).toBeInstanceOf(Date);
  });

  it("gates the email on the previous status, exactly as the single form does", async () => {
    // pending → shipped is allowed but is not the paid → shipped transition, so
    // it must not tell the customer their order is on its way.
    const pending = await makeOrder({ status: "pending" });

    await apply("shipped", [pending.id]);

    expect((await readOrder(pending.id)).status).toBe("shipped");
    expect(notifyOrderShipped).not.toHaveBeenCalled();
  });

  it("restores stock and discount usage when cancelling paid orders", async () => {
    const discount = await makeDiscount({ usedCount: 3 });
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      status: "paid",
      discountCodeId: discount.id,
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    const result = await apply("cancelled", [order.id]);

    expect((await readProduct(product.id)).stockQty).toBe(12);
    expect((await readDiscount(discount.id)).usedCount).toBe(2);
    expect(result.message).toContain("Stock was restored");
  });

  it("does not restock an order that was never paid", async () => {
    const product = await makeProduct({ stockQty: 5 });
    const pending = await makeOrder({
      status: "pending",
      items: [{ productId: product.id, unitPriceCents: 1000, quantity: 2 }],
    });

    await apply("cancelled", [pending.id]);

    // Stock was never decremented for a pending order, so giving it back would
    // invent inventory.
    expect((await readProduct(product.id)).stockQty).toBe(5);
  });

  it("ignores ids that do not exist rather than failing the batch", async () => {
    const real = await makeOrder({ status: "paid" });

    const result = await apply("shipped", [real.id, "00000000-0000-0000-0000-000000000000"]);

    expect(result.status).toBe("success");
    expect(result.message).toContain("1 order");
    expect((await readOrder(real.id)).status).toBe("shipped");
  });

  it("does not count orders already in the target status as updated", async () => {
    // `applyOrderStatusChange` returns `found: true` for a row that exists even
    // when nothing changed, so counting on it alone reported "2 orders marked
    // shipped" for one real change and one no-op.
    const changed = await makeOrder({ status: "paid" });
    const already = await makeOrder({ status: "shipped" });

    const result = await apply("shipped", [changed.id, already.id]);

    expect(result.message).toContain("1 order marked shipped");
    expect(result.message).toContain("1 was already shipped");
  });

  it("says so when the customer could not be emailed", async () => {
    // The status change has already committed by this point, so this must not
    // read as a failed update — but it must not read as a clean success either.
    notifyOrderShipped.mockRejectedValueOnce(new Error("resend is down"));
    const order = await makeOrder({ status: "paid" });

    const result = await apply("shipped", [order.id]);

    expect((await readOrder(order.id)).status).toBe("shipped");
    expect(result.message).toContain("1 order marked shipped");
    expect(result.message).toContain("couldn't be emailed");
    expect(result.message).not.toContain("couldn't be updated");
  });

  it("reports a batch that was entirely already in the target status", async () => {
    const already = await makeOrder({ status: "shipped" });

    const result = await apply("shipped", [already.id]);

    expect(result.status).toBe("error");
    expect(result.message).toContain("Nothing to update");
    expect(result.message).toContain("already shipped");
    expect(notifyOrderShipped).not.toHaveBeenCalled();
  });

  it("refuses an empty selection", async () => {
    const result = await apply("shipped", []);
    expect(result.status).toBe("error");
  });

  it("refuses a status the single-order form would refuse", async () => {
    // `paid` is webhook-owned. Bulk must not be a side door to it.
    const order = await makeOrder({ status: "pending" });

    const result = await apply("paid", [order.id]);

    expect(result.status).toBe("error");
    expect((await readOrder(order.id)).status).toBe("pending");
  });

  it("refuses ids that are not uuids", async () => {
    // These reach a `WHERE id IN (…)`, and a non-uuid is what made the Xendit
    // webhook 500 in a retry loop on 2026-07-29 (22P02).
    const result = await apply("shipped", ["not-a-uuid"]);
    expect(result.status).toBe("error");
  });
});
