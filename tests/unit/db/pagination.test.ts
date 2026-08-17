import { describe, expect, it } from "vitest";
import { readEnumParam, readPageParam, resolvePage } from "@/lib/db/pagination";

/**
 * The clamp and the param coercion every admin list used to do for itself.
 *
 * These are here rather than exercised through a page render for the same reason
 * lib/shop/query.ts is: they are pure string and integer handling fed from the
 * address bar, and the things that go wrong with them — a hand-edited page
 * number, a stale status from a renamed set, an offset computed before the
 * clamp — need no React and no database to reproduce.
 */

describe("resolvePage", () => {
  it("computes the offset from the clamped page, not the requested one", () => {
    // The ordering is the whole point. Deriving an offset from ?page=999 sends
    // a LIMIT/OFFSET past the end of the table and returns an empty list from a
    // URL that looks perfectly valid.
    const r = resolvePage({ total: 45, requestedPage: 999, pageSize: 20 });
    expect(r.page).toBe(3);
    expect(r.totalPages).toBe(3);
    expect(r.offset).toBe(40);
  });

  it("floors at page 1 for anything below it", () => {
    expect(resolvePage({ total: 45, requestedPage: 0, pageSize: 20 }).page).toBe(1);
    expect(resolvePage({ total: 45, requestedPage: -7, pageSize: 20 }).page).toBe(1);
    expect(resolvePage({ total: 45, requestedPage: -7, pageSize: 20 }).offset).toBe(0);
  });

  it("reports 1 total page for an empty list, not 0", () => {
    // "Page 1 of 0" is what AdminPagination renders from a bare ceil(0/20), and
    // it reads as a bug rather than as an empty table.
    const r = resolvePage({ total: 0, requestedPage: 1, pageSize: 20 });
    expect(r.totalPages).toBe(1);
    expect(r.page).toBe(1);
    expect(r.offset).toBe(0);
  });

  it("does not add an empty page when the count divides exactly", () => {
    expect(resolvePage({ total: 40, requestedPage: 1, pageSize: 20 }).totalPages).toBe(2);
    expect(resolvePage({ total: 41, requestedPage: 1, pageSize: 20 }).totalPages).toBe(3);
  });

  it("passes the page size through as the limit", () => {
    expect(resolvePage({ total: 100, requestedPage: 2, pageSize: 9 })).toEqual({
      page: 2,
      totalPages: 12,
      limit: 9,
      offset: 9,
    });
  });
});

describe("readPageParam", () => {
  it("accepts a positive integer", () => {
    expect(readPageParam("3")).toBe(3);
  });

  it("falls back to 1 for everything a hand-edited URL can carry", () => {
    // Each of these reached the old `Number(sp.page) || 1`, and "1.5" is the one
    // it let through — Number("1.5") is truthy, so it became a fractional
    // OFFSET.
    expect(readPageParam("1.5")).toBe(1);
    expect(readPageParam("-3")).toBe(1);
    expect(readPageParam("0")).toBe(1);
    expect(readPageParam("abc")).toBe(1);
    expect(readPageParam("")).toBe(1);
    expect(readPageParam(undefined)).toBe(1);
    expect(readPageParam(null)).toBe(1);
  });

  it("rejects a number too large to be an exact integer", () => {
    expect(readPageParam("1e999")).toBe(1);
  });
});

describe("readEnumParam", () => {
  const STATUSES = ["pending", "paid", "shipped"] as const;

  it("returns a value the list offers", () => {
    expect(readEnumParam(STATUSES, "paid")).toBe("paid");
  });

  it("returns the no-filter empty string for anything else", () => {
    // Empty string rather than undefined or null, because that is what
    // AdminFilterTabs renders as its selected "All" tab.
    expect(readEnumParam(STATUSES, "cancelled")).toBe("");
    expect(readEnumParam(STATUSES, "PAID")).toBe("");
    expect(readEnumParam(STATUSES, "")).toBe("");
    expect(readEnumParam(STATUSES, undefined)).toBe("");
    expect(readEnumParam(STATUSES, null)).toBe("");
  });

  it("does not match inherited Object properties", () => {
    // `includes` is used rather than a plain `in` or a bare object lookup, so
    // "constructor" and "toString" are ordinary misses.
    expect(readEnumParam(STATUSES, "constructor")).toBe("");
    expect(readEnumParam(STATUSES, "toString")).toBe("");
  });
});
