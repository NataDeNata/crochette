/**
 * Helpers for turning a user's free-text search box into a LIKE pattern.
 *
 * The admin lists all build their filter as `ilike(column, `%${q}%`)`, which
 * hands the raw query straight to Postgres' pattern matcher. `%` and `_` are
 * wildcards there, so a perfectly ordinary search silently means something
 * else: `100%` becomes the pattern `%100%%`, which matches every row, and any
 * `_` matches an arbitrary character. Not injectable — Drizzle still
 * parameterises the value — just wrong, and wrong in the direction of "too
 * many results" that nobody reports as a bug.
 */

/** Escape the LIKE metacharacters, so the query matches itself literally.
 *
 * The backslash must be escaped first, or escaping `%` and `_` would then
 * double-escape the backslashes this function just introduced. Postgres
 * treats `\` as the default LIKE escape character, so no ESCAPE clause is
 * needed. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** A `%…%` contains-pattern for a free-text search box. */
export function containsPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}
