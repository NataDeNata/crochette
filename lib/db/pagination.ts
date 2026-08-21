/**
 * The arithmetic every paginated admin list was doing for itself.
 *
 * This is deliberately *not* a `paginate({ table, where, orderBy })` query
 * builder, which is the obvious shape and the wrong one here. The four lists
 * disagree about their queries in ways a wrapper would have to fight: the orders
 * list needs a second `inArray` pass for item counts, the products list needs a
 * second *unfiltered* count to label its "Low stock (N)" tab, and the customers
 * list is a `leftJoin` grouped by customer and ordered by an aggregate. Only two
 * of the four would have fitted, and the other two would have ended up reaching
 * around the helper.
 *
 * What genuinely was duplicated — four times, and one copy carried a comment
 * conceding the inconsistency (lib/db/analytics.ts) — is the clamp arithmetic
 * and the param coercion. Both are pure, so both are unit-testable without a
 * Postgres container, which is the same argument that moved the shop's filter
 * logic into lib/shop/query.ts.
 */

/** Where a requested page actually lands, given how many rows there are. */
export type ResolvedPage = {
  /** The effective page — never below 1, never past the last real page. */
  page: number;
  /** At least 1, so an empty list reads "Page 1 of 1" rather than "of 0". */
  totalPages: number;
  limit: number;
  offset: number;
};

/**
 * Clamp a requested page against the row count.
 *
 * Clamping rather than 404ing or returning nothing: `?page=999` on a shrinking
 * list is what a bookmark becomes after a few orders are archived, and landing
 * on the last real page is what the visitor meant. The clamp has to happen
 * *after* the count and *before* the offset — computing an offset from an
 * unclamped page is how a valid-looking URL returns an empty table.
 */
export function resolvePage({
  total,
  requestedPage,
  pageSize,
}: {
  total: number;
  requestedPage: number;
  pageSize: number;
}): ResolvedPage {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return { page, totalPages, limit: pageSize, offset: (page - 1) * pageSize };
}

/**
 * A `?page=` value from the address bar, as a positive integer.
 *
 * Everything here arrives from anyone, so every rejected input falls back to 1
 * rather than propagating: `?page=-3`, `?page=abc`, `?page=1.5` and `?page=`
 * are all page 1. Mirrors `readPage` in lib/shop/query.ts, which does the same
 * job for the storefront's own URL state.
 */
export function readPageParam(raw: string | undefined | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * A status filter from the address bar, narrowed to one of the values the list
 * actually offers — or `""` for "no filter", which is what the empty case has
 * to be because it is also what `AdminFilterTabs` renders as its "All" tab.
 *
 * This replaces three hand-written variants of
 * `LIST.includes(sp.status as T) ? sp.status! : ""`, each of which needed a cast
 * *and* a non-null assertion to get past the compiler. The signature here gets
 * the narrowing from the predicate instead, so no call site asserts anything.
 */
export function readEnumParam<T extends string>(
  allowed: readonly T[],
  raw: string | undefined | null,
): T | "" {
  return allowed.includes(raw as T) ? (raw as T) : "";
}
