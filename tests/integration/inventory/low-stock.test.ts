import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { isLowStock, lowStockCondition } from "@/lib/db/inventory";
import { LOW_STOCK_CASES } from "../../fixtures/low-stock-cases";
import { makeProduct } from "../helpers/factories";

/**
 * The SQL half of the low-stock rule.
 *
 * The case table is IMPORTED from the unit test of `isLowStock` rather than
 * retyped, because the two functions exist to encode one rule in two languages
 * and the whole point of `lowStockCondition` is that the dashboard count, the
 * `?stock=low` filter and the per-row badge cannot disagree. Sharing the table
 * means a change made in only one of the two twins fails here.
 */

async function lowStockIds(): Promise<string[]> {
  const rows = await db.select({ id: products.id }).from(products).where(lowStockCondition);
  return rows.map((r) => r.id);
}

describe("lowStockCondition", () => {
  it.each(LOW_STOCK_CASES)("$label -> $low", async ({ row, low }) => {
    const product = await makeProduct(row);

    expect(await lowStockIds()).toEqual(low ? [product.id] : []);
  });

  it("agrees with isLowStock on every case, row for row", async () => {
    const created = await Promise.all(
      LOW_STOCK_CASES.map(({ row }) => makeProduct(row))
    );

    const flagged = new Set(await lowStockIds());

    for (const product of created) {
      expect(flagged.has(product.id)).toBe(isLowStock(product));
    }
  });

  it("selects only the low rows out of a mixed catalogue", async () => {
    const low = await makeProduct({ status: "active", stockQty: 2, lowStockThreshold: 3 });
    await makeProduct({ status: "active", stockQty: 40, lowStockThreshold: 3 });
    await makeProduct({ status: "active", stockQty: 0, lowStockThreshold: 3 });
    await makeProduct({ status: "draft", stockQty: 1, lowStockThreshold: 3 });

    expect(await lowStockIds()).toEqual([low.id]);
  });

  it("uses each product's own threshold, not one sitewide number", async () => {
    // A ₱380 coaster set with 67 in stock and a ₱1,200 wall hanging with 3 are
    // not the same situation — which is why the threshold is per-product.
    const wallHanging = await makeProduct({ stockQty: 3, lowStockThreshold: 5 });
    await makeProduct({ stockQty: 67, lowStockThreshold: 5 });
    const coasters = await makeProduct({ stockQty: 60, lowStockThreshold: 100 });

    expect((await lowStockIds()).sort()).toEqual([wallHanging.id, coasters.id].sort());
  });
});
