import { describe, expect, it } from "vitest";
import { formatPrice, LOW_STOCK_THRESHOLD } from "@/lib/data/products";
import { isLowStock } from "@/lib/db/inventory";

describe("formatPrice", () => {
  it("renders pesos with no decimal places", () => {
    expect(formatPrice(120000)).toBe("₱1,200");
    expect(formatPrice(38000)).toBe("₱380");
  });

  it("shows centavos only when an amount actually has them", () => {
    // `minimumFractionDigits: 0` is a floor, not a cap, so a non-whole amount
    // keeps its decimals. Every catalogue price is whole pesos, so this never
    // surfaces today — pinned so a future part-peso amount is a visible choice
    // rather than a surprise in a receipt.
    expect(formatPrice(38050)).toBe("₱380.5");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("₱0");
  });

  it("renders a negative amount, which the discount line depends on", () => {
    expect(formatPrice(20000)).toBe("₱200");
    expect(formatPrice(-20000)).toBe("-₱200");
  });
});

/**
 * `isLowStock` is the row-level twin of the SQL `lowStockCondition`. The two
 * encode one rule in two languages, so they are given the SAME table of cases —
 * this file asserts the TypeScript side, tests/integration/inventory/low-stock
 * asserts the SQL side against a real database. A change to one that isn't
 * mirrored in the other fails in exactly one of the two places.
 */
export const LOW_STOCK_CASES: Array<{
  label: string;
  row: { status: string; stockQty: number; lowStockThreshold: number };
  low: boolean;
}> = [
  { label: "at the threshold (inclusive)", row: { status: "active", stockQty: 3, lowStockThreshold: 3 }, low: true },
  { label: "below the threshold", row: { status: "active", stockQty: 1, lowStockThreshold: 3 }, low: true },
  { label: "one above the threshold (exclusive)", row: { status: "active", stockQty: 4, lowStockThreshold: 3 }, low: false },
  { label: "comfortably stocked", row: { status: "active", stockQty: 67, lowStockThreshold: 3 }, low: false },
  { label: "zero stock is sold out, not low", row: { status: "active", stockQty: 0, lowStockThreshold: 3 }, low: false },
  { label: "a threshold of 0 disables the alert", row: { status: "active", stockQty: 1, lowStockThreshold: 0 }, low: false },
  { label: "a draft is not for sale", row: { status: "draft", stockQty: 1, lowStockThreshold: 3 }, low: false },
  { label: "a manual sold_out hold is deliberate, not a nag", row: { status: "sold_out", stockQty: 1, lowStockThreshold: 3 }, low: false },
];

describe("isLowStock", () => {
  it.each(LOW_STOCK_CASES)("$label -> $low", ({ row, low }) => {
    expect(isLowStock(row)).toBe(low);
  });

  it("keeps the three tiers non-overlapping, so a row carries exactly one signal", () => {
    for (const { row } of LOW_STOCK_CASES) {
      const soldOut = row.stockQty === 0;
      expect(isLowStock(row) && soldOut).toBe(false);
    }
  });

  it("is a different number from the storefront's customer-facing badge", () => {
    // The duplication is intentional: LOW_STOCK_THRESHOLD is a conversion lever
    // aimed at shoppers, low_stock_threshold is a restock trigger aimed at the
    // owner. This pins that they are separate knobs, not an accident to unify.
    expect(LOW_STOCK_THRESHOLD).toBe(5);
    expect(isLowStock({ status: "active", stockQty: 5, lowStockThreshold: 3 })).toBe(false);
  });
});
