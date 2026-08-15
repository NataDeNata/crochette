import { describe, expect, it } from "vitest";
import {
  isInvalidTextRepresentation,
  isUniqueViolation,
  PG_INVALID_TEXT_REPRESENTATION,
  PG_UNIQUE_VIOLATION,
} from "@/lib/db/errors";

/**
 * The discriminator behind the Xendit webhook's terminal-400 fix.
 *
 * Its whole reason to exist is that the obvious `err.code === "22P02"` check
 * never matches: Drizzle 0.45 wraps driver errors and does not copy `code` onto
 * the wrapper. A test that only ever built a flat `{ code }` object would pass
 * against the naive implementation and prove nothing — so the nesting is the
 * point of these cases.
 *
 * The *real* error shape (a live Postgres 22P02 through Drizzle) is asserted in
 * tests/integration/webhook/xendit.test.ts. This file covers the walk itself.
 */

/** Approximates DrizzleQueryError wrapping a postgres-js PostgresError. */
function wrap(depth: number, code: string): Error {
  let err: Error & { code?: string; cause?: unknown } = Object.assign(
    new Error("invalid input syntax for type uuid"),
    { code }
  );
  for (let i = 0; i < depth; i++) {
    err = Object.assign(new Error("Failed query"), { cause: err });
  }
  return err;
}

describe("isInvalidTextRepresentation", () => {
  it("exports the SQLSTATE it discriminates on", () => {
    expect(PG_INVALID_TEXT_REPRESENTATION).toBe("22P02");
  });

  it.each([0, 1, 2, 3, 4])("finds 22P02 at cause depth %i", (depth) => {
    expect(isInvalidTextRepresentation(wrap(depth, "22P02"))).toBe(true);
  });

  it("gives up past the depth cap rather than walking forever", () => {
    expect(isInvalidTextRepresentation(wrap(6, "22P02"))).toBe(false);
  });

  it("terminates on a self-referential cause chain", () => {
    const err: Record<string, unknown> = { message: "loop" };
    err.cause = err;
    expect(isInvalidTextRepresentation(err)).toBe(false);
  });

  // These must NOT match. A malformed id is terminal and gets a 400; every other
  // SQLSTATE means "retrying may work" and must keep its 500, or a transient
  // outage would silently stop Xendit retrying a payment we failed to record.
  it.each([
    ["42P01", "undefined_table"],
    ["42601", "syntax_error"],
    ["42703", "undefined_column"],
    ["57014", "query_canceled"],
    ["23505", "unique_violation"],
  ])("does not match %s (%s), so it stays retryable", (code) => {
    expect(isInvalidTextRepresentation(wrap(1, code))).toBe(false);
  });

  it.each([
    ["a plain error", new Error("connection terminated")],
    ["null", null],
    ["undefined", undefined],
    ["a string", "22P02"],
  ])("returns false for %s", (_label, err) => {
    expect(isInvalidTextRepresentation(err)).toBe(false);
  });
});

/**
 * The admin actions used to ask `err.message.includes("unique")`. That is the
 * shape these cases exist to rule out: `wrap()` builds errors whose message is
 * "invalid input syntax for type uuid" / "Failed query", so anything matching
 * here matched on the SQLSTATE and not on wording.
 */
describe("isUniqueViolation", () => {
  it("exports the SQLSTATE it discriminates on", () => {
    expect(PG_UNIQUE_VIOLATION).toBe("23505");
  });

  it.each([0, 1, 2, 3, 4])("finds 23505 at cause depth %i", (depth) => {
    expect(isUniqueViolation(wrap(depth, "23505"))).toBe(true);
  });

  it("gives up past the depth cap rather than walking forever", () => {
    expect(isUniqueViolation(wrap(6, "23505"))).toBe(false);
  });

  it("terminates on a self-referential cause chain", () => {
    const err: Record<string, unknown> = { message: "loop" };
    err.cause = err;
    expect(isUniqueViolation(err)).toBe(false);
  });

  // The old message check called all of these a duplicate slug, and told the
  // admin to change a slug that was never the problem.
  it.each([
    ["22P02", "invalid_text_representation"],
    ["23503", "foreign_key_violation"],
    ["23502", "not_null_violation"],
    ["57014", "query_canceled"],
  ])("does not match %s (%s)", (code) => {
    expect(isUniqueViolation(wrap(1, code))).toBe(false);
  });

  it("does not match on the word alone, which is what it replaced", () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "products_slug_unique"'), {
      code: "08006",
    });
    expect(isUniqueViolation(err)).toBe(false);
  });

  it.each([
    ["a plain error", new Error("connection terminated")],
    ["null", null],
    ["undefined", undefined],
    ["a string", "23505"],
  ])("returns false for %s", (_label, err) => {
    expect(isUniqueViolation(err)).toBe(false);
  });
});
