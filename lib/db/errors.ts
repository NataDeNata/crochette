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
export function isInvalidTextRepresentation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current != null && depth < 5; depth++) {
    if ((current as { code?: unknown }).code === PG_INVALID_TEXT_REPRESENTATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
