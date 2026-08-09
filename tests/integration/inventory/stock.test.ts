import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  decrementStockForOrder,
  getOrderProductSlugs,
  restoreStockForOrder,
} from "@/lib/db/inventory";
import { makeOrder, makeProduct, readProduct } from "../helpers/factories";

/** Both stock functions take a transaction, mirroring their real callers (the
 * Xendit webhook and the admin cancel path). */
const inTx = (run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) =>
  db.transaction(run);

describe("decrementStockForOrder", () => {
  it("subtracts each line's quantity", async () => {
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 3 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect((await readProduct(product.id)).stockQty).toBe(7);
  });

  it("handles an order with several lines", async () => {
    const bear = await makeProduct({ stockQty: 10 });
    const basket = await makeProduct({ stockQty: 4 });
    const order = await makeOrder({
      items: [
        { productId: bear.id, unitPriceCents: 120000, quantity: 2 },
        { productId: basket.id, unitPriceCents: 38000, quantity: 1 },
      ],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect((await readProduct(bear.id)).stockQty).toBe(8);
    expect((await readProduct(basket.id)).stockQty).toBe(3);
  });

  it("clamps at zero rather than going negative when more was sold than held", async () => {
    const product = await makeProduct({ stockQty: 2 });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 5 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect((await readProduct(product.id)).stockQty).toBe(0);
  });

  it("flips a product to sold_out the moment its stock reaches zero", async () => {
    const product = await makeProduct({ stockQty: 2, status: "active" });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 0, status: "sold_out" });
  });

  it("leaves the status alone while stock remains", async () => {
    const product = await makeProduct({ stockQty: 5, status: "active" });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 1 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect((await readProduct(product.id)).status).toBe("active");
  });

  it("never promotes a draft out of draft, since that is an admin-owned state", async () => {
    const product = await makeProduct({ stockQty: 2, status: "draft" });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 0, status: "draft" });
  });

  it("does nothing for an order with no items", async () => {
    const product = await makeProduct({ stockQty: 5 });
    const order = await makeOrder();

    await inTx((tx) => decrementStockForOrder(tx, order.id));

    expect((await readProduct(product.id)).stockQty).toBe(5);
  });
});

describe("restoreStockForOrder", () => {
  it("puts back exactly what was taken", async () => {
    const product = await makeProduct({ stockQty: 10 });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 3 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));
    await inTx((tx) => restoreStockForOrder(tx, order.id));

    expect((await readProduct(product.id)).stockQty).toBe(10);
  });

  it("flips sold_out back to active once there is stock again", async () => {
    const product = await makeProduct({ stockQty: 2, status: "active" });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await inTx((tx) => decrementStockForOrder(tx, order.id));
    expect((await readProduct(product.id)).status).toBe("sold_out");

    await inTx((tx) => restoreStockForOrder(tx, order.id));

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 2, status: "active" });
  });

  it("does not republish a product an admin parked at sold_out while it still had stock", async () => {
    // The withdrawn-on-purpose case: pulled from the storefront with stock on
    // the shelf, and carrying order history from before it was pulled. The
    // stock still goes back; the storefront listing must not.
    const product = await makeProduct({ stockQty: 48, status: "sold_out" });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await inTx((tx) => restoreStockForOrder(tx, order.id));

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 50, status: "sold_out" });
  });

  it("does not resurrect a draft", async () => {
    const product = await makeProduct({ stockQty: 0, status: "draft" });
    const order = await makeOrder({
      items: [{ productId: product.id, unitPriceCents: 120000, quantity: 2 }],
    });

    await inTx((tx) => restoreStockForOrder(tx, order.id));

    expect(await readProduct(product.id)).toMatchObject({ stockQty: 2, status: "draft" });
  });
});

describe("getOrderProductSlugs", () => {
  it("returns the slugs whose storefront pages need revalidating", async () => {
    const bear = await makeProduct({ slug: "milo-the-bear", stockQty: 5 });
    const basket = await makeProduct({ slug: "cloud-basket", stockQty: 5 });
    const order = await makeOrder({
      items: [
        { productId: bear.id, unitPriceCents: 120000, quantity: 1 },
        { productId: basket.id, unitPriceCents: 38000, quantity: 1 },
      ],
    });

    expect((await getOrderProductSlugs(order.id)).sort()).toEqual(["cloud-basket", "milo-the-bear"]);
  });

  it("returns nothing for an order with no items", async () => {
    const order = await makeOrder();
    expect(await getOrderProductSlugs(order.id)).toEqual([]);
  });
});
