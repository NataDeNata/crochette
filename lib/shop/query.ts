import { CATEGORIES, type Product, type ProductCategory } from "@/lib/data/products";

export const PAGE_SIZE = 9;

export const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];

export type ShopQuery = {
  active: ProductCategory | "all";
  query: string;
  sort: Sort;
  page: number;
};

const CATEGORY_VALUES = new Set(CATEGORIES.map((c) => c.value));

/* Reading the shop's state out of the query string, and writing it back.
 *
 * Split out of ShopGrid so it can be tested without mounting React — this
 * project has no React Testing Library, and the parts of a URL-driven filter
 * that go wrong (a hand-edited `?page=-3`, a stale `?category=` from a renamed
 * category, a default written into the URL that should have been omitted) are
 * all pure string handling.
 *
 * Every reader takes anything and returns something valid. These values arrive
 * from the address bar, which means they arrive from anyone. */

export function readCategory(raw: string | null): ProductCategory | "all" {
  return raw && CATEGORY_VALUES.has(raw as ProductCategory) ? (raw as ProductCategory) : "all";
}

export function readSort(raw: string | null): Sort {
  return SORTS.some((s) => s.value === raw) ? (raw as Sort) : "newest";
}

export function readPage(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * Defaults are omitted rather than written as `?category=all&sort=newest`, so
 * /shop stays /shop until the shopper actually narrows something — and so the
 * canonical URL and the one in the address bar agree for an unfiltered visit.
 */
export function buildQuery(state: ShopQuery): string {
  const params = new URLSearchParams();
  if (state.active !== "all") params.set("category", state.active);
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

/**
 * Category, then name search, then sort. Kept beside the readers because the
 * two have to agree about what each value means: `sort=newest` is only
 * "newest" because `getProducts()` returns the catalogue by `createdAt` asc,
 * so newest-first is that order reversed rather than a field of its own.
 */
export function selectProducts(products: Product[], state: Omit<ShopQuery, "page">): Product[] {
  const byCategory =
    state.active === "all" ? products : products.filter((p) => p.category === state.active);

  const q = state.query.trim().toLowerCase();
  const matched = q
    ? byCategory.filter((p) => p.name.toLowerCase().includes(q))
    : byCategory;

  if (state.sort === "newest") return [...matched].reverse();
  return [...matched].sort((a, b) =>
    state.sort === "price-asc" ? a.priceCents - b.priceCents : b.priceCents - a.priceCents,
  );
}
