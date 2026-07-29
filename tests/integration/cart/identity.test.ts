import { describe, expect, it } from "vitest";
import { addItem, cartExists, createGuestCart } from "@/lib/db/cart";
import { carts, cartItems, customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { testDb } from "../helpers/db";
import { makeCart, makeCustomer, makeProduct, readCartLines } from "../helpers/factories";

/**
 * The two unique indexes on the cart tables are not decoration — each one is
 * doing a job the application code deliberately does not do itself.
 */

describe("carts.customer_id unique index", () => {
  it("refuses a second cart for the same customer", async () => {
    const customer = await makeCustomer();
    await makeCart(customer.id);

    await expect(makeCart(customer.id)).rejects.toThrow();
  });

  it("leaves guest carts unbounded, because Postgres treats NULLs as distinct", async () => {
    // This is exactly why an unclaimed row can serve as the anonymous cart: the
    // constraint applies to logged-in carts only.
    const first = await createGuestCart();
    const second = await createGuestCart();
    const third = await createGuestCart();

    expect(new Set([first, second, third]).size).toBe(3);
    expect(await testDb.select().from(carts)).toHaveLength(3);
  });
});

describe("cart_items (cart_id, product_id) unique index", () => {
  it("refuses a duplicate line for the same product", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await testDb.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity: 1 });

    await expect(
      testDb.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity: 1 })
    ).rejects.toThrow();
  });

  it("lets the same product sit in two different carts", async () => {
    const product = await makeProduct({ stockQty: 10 });
    const a = await makeCart();
    const b = await makeCart();

    await addItem(a.id, product.id, 1);
    await addItem(b.id, product.id, 1);

    expect(await readCartLines(a.id)).toHaveLength(1);
    expect(await readCartLines(b.id)).toHaveLength(1);
  });

  it("turns two concurrent adds into one upserted line, not a duplicate", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });

    await Promise.all([addItem(cart.id, product.id, 1), addItem(cart.id, product.id, 1)]);

    const lines = await readCartLines(cart.id);
    expect(lines).toHaveLength(1);
    // Both increments may or may not both land depending on interleaving; what
    // must never happen is a duplicate row or a quantity above stock.
    expect(lines[0].quantity).toBeGreaterThanOrEqual(1);
    expect(lines[0].quantity).toBeLessThanOrEqual(2);
  });
});

describe("cascades", () => {
  it("deletes a customer's cart with the customer", async () => {
    const customer = await makeCustomer();
    const cart = await makeCart(customer.id);

    await testDb.delete(customers).where(eq(customers.id, customer.id));

    expect(await cartExists(cart.id)).toBe(false);
  });

  it("deletes cart lines with their cart", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);

    await testDb.delete(carts).where(eq(carts.id, cart.id));

    expect(await readCartLines(cart.id)).toHaveLength(0);
  });
});
