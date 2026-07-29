import { describe, expect, it } from "vitest";
import {
  addItem,
  clearCart,
  createGuestCart,
  getCartView,
  getRawCartItems,
  removeItem,
  setItemQuantity,
} from "@/lib/db/cart";
import { carts, products as productsTable } from "@/lib/db/schema";
import { addCartLine, makeCart, makeProduct, readCartLines } from "../helpers/factories";
import { testDb } from "../helpers/db";

describe("addItem", () => {
  it("adds a line", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });

    await addItem(cart.id, product.id, 2);

    expect(await readCartLines(cart.id)).toMatchObject([{ productId: product.id, quantity: 2 }]);
  });

  it("increments an existing line instead of inserting a duplicate", async () => {
    // The (cart_id, product_id) unique index is what makes this a real upsert
    // rather than a read-then-write that races a second tab.
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });

    await addItem(cart.id, product.id, 2);
    await addItem(cart.id, product.id, 3);

    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 5 }]);
  });

  it("clamps to available stock, in SQL, against the same snapshot as the write", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 4 });

    await addItem(cart.id, product.id, 99);

    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 4 }]);
  });

  it("clamps a top-up that would exceed stock", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 4 });

    await addItem(cart.id, product.id, 3);
    await addItem(cart.id, product.id, 3);

    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 4 }]);
  });

  it.each([
    ["a draft product", { status: "draft" as const, stockQty: 10 }],
    ["a sold-out product", { status: "sold_out" as const, stockQty: 10 }],
    ["a product with no stock", { status: "active" as const, stockQty: 0 }],
  ])("silently ignores %s", async (_label, overrides) => {
    // Deliberately silent: the caller re-reads the cart and the UI reconciles.
    const cart = await makeCart();
    const product = await makeProduct(overrides);

    await addItem(cart.id, product.id, 1);

    expect(await readCartLines(cart.id)).toHaveLength(0);
  });

  it("ignores an unknown product id without throwing", async () => {
    const cart = await makeCart();
    await addItem(cart.id, "00000000-0000-4000-8000-000000000000", 1);
    expect(await readCartLines(cart.id)).toHaveLength(0);
  });

  it.each([0, -1, 0.4])("ignores a quantity of %s", async (quantity) => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });

    await addItem(cart.id, product.id, quantity);

    expect(await readCartLines(cart.id)).toHaveLength(0);
  });

  it("truncates a fractional quantity rather than storing it", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });

    await addItem(cart.id, product.id, 2.7);

    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 2 }]);
  });
});

describe("setItemQuantity", () => {
  it("sets an exact quantity", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 5);

    await setItemQuantity(cart.id, product.id, 2);

    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 2 }]);
  });

  it("clamps to stock", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 3 });
    await addItem(cart.id, product.id, 1);

    await setItemQuantity(cart.id, product.id, 99);

    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 3 }]);
  });

  it.each([0, -5])("removes the line when set to %s", async (quantity) => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 2);

    await setItemQuantity(cart.id, product.id, quantity);

    expect(await readCartLines(cart.id)).toHaveLength(0);
  });

  it("removes a line whose product has since sold out", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 2 });
    await addItem(cart.id, product.id, 2);
    await testDb.update(productsTable).set({ stockQty: 0 });

    await setItemQuantity(cart.id, product.id, 2);

    expect(await readCartLines(cart.id)).toHaveLength(0);
  });
});

describe("removeItem and clearCart", () => {
  it("removes one line and leaves the rest", async () => {
    const cart = await makeCart();
    const bear = await makeProduct({ stockQty: 5 });
    const basket = await makeProduct({ stockQty: 5 });
    await addItem(cart.id, bear.id, 1);
    await addItem(cart.id, basket.id, 1);

    await removeItem(cart.id, bear.id);

    expect(await readCartLines(cart.id)).toMatchObject([{ productId: basket.id }]);
  });

  it("empties the cart without deleting it, so the cookie stays valid", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 5 });
    await addItem(cart.id, product.id, 2);

    await clearCart(cart.id);

    expect(await readCartLines(cart.id)).toHaveLength(0);
    const stillThere = await testDb.query.carts.findFirst({ where: (c, { eq }) => eq(c.id, cart.id) });
    expect(stillThere).toBeDefined();
  });
});

describe("updated_at", () => {
  // Abandoned-cart recovery needs a real last-activity timestamp, so every
  // mutation has to touch it — including the ones that only delete.
  it.each([
    ["addItem", async (cartId: string, productId: string) => addItem(cartId, productId, 1)],
    ["setItemQuantity", async (cartId: string, productId: string) => setItemQuantity(cartId, productId, 2)],
    ["removeItem", async (cartId: string, productId: string) => removeItem(cartId, productId)],
    ["clearCart", async (cartId: string) => clearCart(cartId)],
  ])("is moved forward by %s", async (_label, mutate) => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addCartLine(cart.id, product.id, 1);
    await testDb
      .update(carts)
      .set({ updatedAt: new Date("2020-01-01T00:00:00.000Z") });

    await mutate(cart.id, product.id);

    const after = await testDb.query.carts.findFirst({ where: (c, { eq }) => eq(c.id, cart.id) });
    expect(after!.updatedAt.getTime()).toBeGreaterThan(new Date("2020-01-01T00:00:00.000Z").getTime());
  });
});

describe("getCartView", () => {
  it("joins live product data rather than a stored snapshot", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10, priceCents: 120000 });
    await addItem(cart.id, product.id, 2);

    // A price edit in /admin must be reflected on the next read — the reason
    // cart_items stores no price at all.
    await testDb.update(productsTable).set({ priceCents: 150000, name: "Renamed" });

    const view = await getCartView(cart.id);

    expect(view.lines[0]).toMatchObject({ priceCents: 150000, name: "Renamed", quantity: 2 });
    expect(view.subtotalCents).toBe(300000);
    expect(view.count).toBe(2);
  });

  it("drops a line whose product is no longer active", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    await testDb.update(productsTable).set({ status: "draft" });

    const view = await getCartView(cart.id);

    expect(view.lines).toHaveLength(0);
    expect(view.subtotalCents).toBe(0);
  });

  it("clamps on read as well as on write, since stock can fall in between", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 5);
    await testDb.update(productsTable).set({ stockQty: 2 });

    const view = await getCartView(cart.id);

    expect(view.lines[0].quantity).toBe(2);
    // The stored row is untouched — clamping is a display concern here.
    expect(await readCartLines(cart.id)).toMatchObject([{ quantity: 5 }]);
  });

  it("returns an empty view for a cart with no lines", async () => {
    const cartId = await createGuestCart();
    expect(await getCartView(cartId)).toMatchObject({ lines: [], subtotalCents: 0, count: 0 });
  });
});

describe("getRawCartItems", () => {
  it("does NOT clamp to stock, unlike getCartView", async () => {
    // This distinction is load-bearing. Checkout reads the raw rows so it can
    // refuse with "Only 2 left"; reading the clamped view would make that
    // refusal unreachable and quietly charge for 2 when 5 were asked for —
    // structurally the same defect as the webhook's unreachable 400.
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 5);
    await testDb.update(productsTable).set({ stockQty: 2 });

    const raw = await getRawCartItems(cart.id);
    const view = await getCartView(cart.id);

    expect(raw).toMatchObject([{ productId: product.id, quantity: 5 }]);
    expect(view.lines[0].quantity).toBe(2);
  });

  it("does NOT filter out inactive products", async () => {
    const cart = await makeCart();
    const product = await makeProduct({ stockQty: 10 });
    await addItem(cart.id, product.id, 1);
    await testDb.update(productsTable).set({ status: "draft" });

    expect(await getRawCartItems(cart.id)).toHaveLength(1);
    expect((await getCartView(cart.id)).lines).toHaveLength(0);
  });
});
