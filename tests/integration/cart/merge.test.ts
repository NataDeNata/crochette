import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { addItem, cartExists, getOrCreateCustomerCart, mergeCarts } from "@/lib/db/cart";
import { db } from "@/lib/db";
import { carts, products as productsTable } from "@/lib/db/schema";
import { testDb } from "../helpers/db";
import { makeCart, makeCustomer, makeProduct, readCartLines } from "../helpers/factories";

/** Lines as a plain map, so assertions read as quantities rather than rows. */
async function quantities(cartId: string): Promise<Record<string, number>> {
  const lines = await readCartLines(cartId);
  return Object.fromEntries(lines.map((l) => [l.productId, l.quantity]));
}

describe("mergeCarts", () => {
  it("sums quantities so nothing the shopper added disappears", async () => {
    const customer = await makeCustomer();
    const bear = await makeProduct({ stockQty: 10 });
    const basket = await makeProduct({ stockQty: 10 });

    const customerCartId = await getOrCreateCustomerCart(customer.id);
    await addItem(customerCartId, bear.id, 1);

    const guestCart = await makeCart();
    await addItem(guestCart.id, bear.id, 2);
    await addItem(guestCart.id, basket.id, 1);

    const surviving = await mergeCarts(guestCart.id, customer.id);

    expect(surviving).toBe(customerCartId);
    expect(await quantities(surviving)).toEqual({ [bear.id]: 3, [basket.id]: 1 });
  });

  it("clamps the summed quantity to available stock", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 4 });

    const customerCartId = await getOrCreateCustomerCart(customer.id);
    await addItem(customerCartId, product.id, 3);

    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 3);

    await mergeCarts(guestCart.id, customer.id);

    expect(await quantities(customerCartId)).toEqual({ [product.id]: 4 });
  });

  it("deletes the guest cart, leaving exactly one live cart", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 1);

    const surviving = await mergeCarts(guestCart.id, customer.id);

    expect(await cartExists(guestCart.id)).toBe(false);
    const remaining = await testDb.select().from(carts);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(surviving);
  });

  it("drops a line whose product was drafted while the guest was shopping", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 2);
    await testDb.update(productsTable).set({ status: "draft" }).where(eq(productsTable.id, product.id));

    const surviving = await mergeCarts(guestCart.id, customer.id);

    expect(await quantities(surviving)).toEqual({});
  });

  it("creates the customer's cart when they do not have one yet", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 2);

    const surviving = await mergeCarts(guestCart.id, customer.id);

    expect(surviving).not.toBe(guestCart.id);
    expect(await quantities(surviving)).toEqual({ [product.id]: 2 });
  });

  it.each([
    ["there is no guest cart", null],
    ["the cookie points at a cart that no longer exists", "00000000-0000-4000-8000-000000000000"],
  ])("is a no-op when %s", async (_label, guestCartId) => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const customerCartId = await getOrCreateCustomerCart(customer.id);
    await addItem(customerCartId, product.id, 2);

    const surviving = await mergeCarts(guestCartId, customer.id);

    expect(surviving).toBe(customerCartId);
    expect(await quantities(surviving)).toEqual({ [product.id]: 2 });
  });

  it("is a no-op when the guest cart is already the customer's cart", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const customerCartId = await getOrCreateCustomerCart(customer.id);
    await addItem(customerCartId, product.id, 2);

    const surviving = await mergeCarts(customerCartId, customer.id);

    expect(surviving).toBe(customerCartId);
    expect(await quantities(surviving)).toEqual({ [product.id]: 2 });
  });

  it("handles an empty guest cart", async () => {
    const customer = await makeCustomer();
    const guestCart = await makeCart();

    const surviving = await mergeCarts(guestCart.id, customer.id);

    expect(await cartExists(guestCart.id)).toBe(false);
    expect(await quantities(surviving)).toEqual({});
  });

  it("is idempotent — merging twice does not double quantities", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 2);

    const first = await mergeCarts(guestCart.id, customer.id);
    const second = await mergeCarts(guestCart.id, customer.id);

    expect(second).toBe(first);
    expect(await quantities(first)).toEqual({ [product.id]: 2 });
  });

  it("runs on the caller's connection when handed an executor", async () => {
    // Regression test for a real deadlock: mergeCarts used to open its own
    // db.transaction unconditionally, so calling it from inside a caller's
    // transaction took a second connection which then blocked on the `carts`
    // unique index the outer transaction already held — resolving only by
    // statement timeout (SQLSTATE 57014). If that returns, this test hangs
    // until the suite's timeout rather than failing fast, which is itself the
    // signal.
    const customer = await makeCustomer();
    const product = await makeProduct({ stockQty: 10 });
    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 2);

    const surviving = await db.transaction(async (tx) => {
      await getOrCreateCustomerCart(customer.id, tx);
      return mergeCarts(guestCart.id, customer.id, tx);
    });

    expect(await quantities(surviving)).toEqual({ [product.id]: 2 });
    expect(await cartExists(guestCart.id)).toBe(false);
  });
});

describe("getOrCreateCustomerCart", () => {
  it("returns the same cart on a second call rather than creating another", async () => {
    const customer = await makeCustomer();

    const first = await getOrCreateCustomerCart(customer.id);
    const second = await getOrCreateCustomerCart(customer.id);

    expect(second).toBe(first);
    expect(await testDb.select().from(carts)).toHaveLength(1);
  });

  it("survives two concurrent calls, as two tabs signing in at once would produce", async () => {
    const customer = await makeCustomer();

    const [a, b] = await Promise.all([
      getOrCreateCustomerCart(customer.id),
      getOrCreateCustomerCart(customer.id),
    ]);

    expect(a).toBe(b);
    expect(await testDb.select().from(carts)).toHaveLength(1);
  });
});
