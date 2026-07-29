import { describe, expect, it } from "vitest";
import { assertDisposableTestDatabase } from "../../setup/env";

/**
 * The guard that stands between a `TRUNCATE` and the production database.
 *
 * `.env.local` holds the live Supabase connection string, and six of the
 * project's environment variables are Vercel Sensitive vars that cannot be read
 * back once set. This check is the reason a stray DATABASE_URL cannot turn an
 * integration run into data loss, so it is tested rather than trusted.
 */
describe("assertDisposableTestDatabase", () => {
  const LOCAL = "postgresql://postgres:postgres@localhost:55432/crochette_test";

  it("accepts a loopback host with a _test database", () => {
    expect(assertDisposableTestDatabase(LOCAL)).toBe(LOCAL);
  });

  it.each([
    "postgresql://postgres:postgres@127.0.0.1:55432/crochette_test",
    "postgres://u:p@localhost:5432/anything_test",
  ])("accepts %s", (url) => {
    expect(assertDisposableTestDatabase(url)).toBe(url);
  });

  it("refuses a remote host even when the database is named _test", () => {
    expect(() =>
      assertDisposableTestDatabase("postgresql://postgres:pw@db.abcdefg.supabase.co:6543/crochette_test")
    ).toThrow(/Refusing to run integration tests against host/);
  });

  it.each([
    ["the real Supabase pooler", "postgresql://postgres:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"],
    ["any other hostname", "postgresql://u:p@example.com:5432/postgres"],
  ])("refuses %s", (_label, url) => {
    expect(() => assertDisposableTestDatabase(url)).toThrow(/Refusing/);
  });

  it("refuses a local database whose name does not end in _test", () => {
    expect(() =>
      assertDisposableTestDatabase("postgresql://postgres:postgres@localhost:5432/crochette")
    ).toThrow(/must end in "_test"/);
  });

  it("refuses a database named only `test` prefixed, not suffixed", () => {
    expect(() =>
      assertDisposableTestDatabase("postgresql://postgres:postgres@localhost:5432/test_crochette")
    ).toThrow(/must end in "_test"/);
  });

  it("refuses a missing URL with an actionable message", () => {
    expect(() => assertDisposableTestDatabase(undefined)).toThrow(/db:test:up/);
    expect(() => assertDisposableTestDatabase("")).toThrow(/db:test:up/);
  });

  it("refuses a malformed URL rather than attempting to parse it loosely", () => {
    expect(() => assertDisposableTestDatabase("this is not a url")).toThrow(/not a valid URL/);
  });

  it("refuses a scheme-less string, which URL parses with an empty host", () => {
    // `new URL("localhost:55432/db")` succeeds — it reads `localhost:` as the
    // scheme and leaves hostname empty. The host check is what catches it, so
    // both halves of the guard are load-bearing.
    expect(() => assertDisposableTestDatabase("localhost:55432/crochette_test")).toThrow(/Refusing/);
  });
});
