/**
 * The low-stock rule, as one table of cases shared by both tests that assert it.
 *
 * `isLowStock` (TypeScript) and `lowStockCondition` (SQL) encode the same rule
 * in two languages, and the entire reason the rule lives in one place is that
 * the dashboard count, the `?stock=low` filter and the per-row badge must not be
 * able to disagree. Sharing this table means a change made to only one of the
 * two twins fails in exactly one of the two test files.
 *
 * Source of the cases: the 8 tier/boundary scenarios exercised against the live
 * database on 2026-07-28.
 */
export type ProductStatus = "active" | "draft" | "sold_out";

export type LowStockCase = {
  label: string;
  row: { status: ProductStatus; stockQty: number; lowStockThreshold: number };
  low: boolean;
};

export const LOW_STOCK_CASES: LowStockCase[] = [
  {
    label: "at the threshold (inclusive)",
    row: { status: "active", stockQty: 3, lowStockThreshold: 3 },
    low: true,
  },
  {
    label: "below the threshold",
    row: { status: "active", stockQty: 1, lowStockThreshold: 3 },
    low: true,
  },
  {
    label: "one above the threshold (exclusive)",
    row: { status: "active", stockQty: 4, lowStockThreshold: 3 },
    low: false,
  },
  {
    label: "comfortably stocked",
    row: { status: "active", stockQty: 67, lowStockThreshold: 3 },
    low: false,
  },
  {
    // Already red with a "sold out" badge. "Low" must mean restock soon, not too late.
    label: "zero stock is sold out, not low",
    row: { status: "active", stockQty: 0, lowStockThreshold: 3 },
    low: false,
  },
  {
    label: "a threshold of 0 disables the alert",
    row: { status: "active", stockQty: 1, lowStockThreshold: 0 },
    low: false,
  },
  {
    label: "a draft is not for sale",
    row: { status: "draft", stockQty: 1, lowStockThreshold: 3 },
    low: false,
  },
  {
    // An admin parking a product at sold_out while it still has stock is a
    // deliberate "not selling this right now" hold, not something to nag about.
    label: "a manual sold_out hold is deliberate, not a nag",
    row: { status: "sold_out", stockQty: 1, lowStockThreshold: 3 },
    low: false,
  },
];
