/**
 * Postgres SQLSTATE 22P02 — `invalid_text_representation`. Raised when a literal
 * cannot be parsed as the target column's type; against a `uuid` column it means
 * the supplied id simply isn't uuid-shaped.
 *
 * This is a *parse* failure on the value we sent, decided before the query
 * reaches any data, so it can never be produced by a dropped connection, a
 * timeout, or an outage. That is precisely what makes it safe to treat
 * differently from every other database error: 22P02 means "this request can
 * never succeed", whereas an outage means "try again shortly". Callers that
 * retry on failure depend on that distinction.
 */
export const PG_INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Postgres SQLSTATE 23505 — `unique_violation`. A slug or discount code that is
 * already taken. Decided by the row, not the connection, so like 22P02 it earns
 * a specific message rather than a generic "try again".
 */
export const PG_UNIQUE_VIOLATION = "23505";

/**
 * Does this error, or anything in its `cause` chain, carry `code`?
 *
 * Drizzle 0.45 wraps driver errors in a `DrizzleQueryError` and does NOT copy
 * `code` onto the wrapper — the SQLSTATE lives on `cause`, a postgres-js
 * `PostgresError`. A direct `err.code === "22P02"` check therefore silently
 * never matches and looks like a working fix while changing nothing, so the
 * cause chain has to be walked.
 *
 * Verified against the live database: a malformed id throws with
 * `cause.code === "22P02"` and `routine === "string_to_uuid"`, while a
 * well-formed but absent id does not throw at all and returns zero rows.
 *
 * The depth cap guards against a self-referential `cause` chain.
 */
function hasSqlState(err: unknown, code: string): boolean {
  let current: unknown = err;
  for (let depth = 0; current != null && depth < 5; depth++) {
    if ((current as { code?: unknown }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** See {@link PG_INVALID_TEXT_REPRESENTATION}. */
export function isInvalidTextRepresentation(err: unknown): boolean {
  return hasSqlState(err, PG_INVALID_TEXT_REPRESENTATION);
}

/**
 * See {@link PG_UNIQUE_VIOLATION}. Replaces four `err.message.includes("unique")`
 * checks in the admin actions — the message is wording Postgres never promised,
 * the SQLSTATE is.
 */
export function isUniqueViolation(err: unknown): boolean {
  return hasSqlState(err, PG_UNIQUE_VIOLATION);
}
