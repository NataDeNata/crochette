import { describe, expect, it } from "vitest";
import {
  barHeightPercent,
  buildRevenueSeries,
  dayKeyLabel,
  formatDate,
  formatDelta,
  percentDelta,
  toDayKey,
} from "@/lib/data/analytics";

/**
 * The pure half of the admin analytics layer. These are the parts that decide
 * what a number *means* — the SQL that produces the raw figures lives in
 * lib/db/analytics.ts and needs a real Postgres, which the unit project doesn't
 * have (see tests/setup/global-db.ts and the note in update.md about Docker).
 */

describe("percentDelta", () => {
  it("computes a whole-percent change in both directions", () => {
    expect(percentDelta(112, 100)).toBe(12);
    expect(percentDelta(80, 100)).toBe(-20);
    expect(percentDelta(100, 100)).toBe(0);
  });

  it("returns null when there is no baseline, rather than Infinity or NaN", () => {
    // This is the whole reason the function exists. On a fresh database — or in
    // the shop's first month — last month is 0, and the naive expression yields
    // Infinity (or NaN when both are 0), which would render as "+Infinity% vs
    // last month" on the dashboard. "Up from nothing" has no honest percentage.
    expect(percentDelta(500, 0)).toBeNull();
    expect(percentDelta(0, 0)).toBeNull();
  });

  it("rounds rather than truncating", () => {
    // 105/103 is 1.94...%, which must not silently become 1%.
    expect(percentDelta(105, 103)).toBe(2);
  });
});

describe("formatDelta", () => {
  it("signs a rise but not a fall, since the minus sign is already there", () => {
    expect(formatDelta(112, 100)).toBe("+12% vs last month");
    expect(formatDelta(80, 100)).toBe("-20% vs last month");
    expect(formatDelta(100, 100)).toBe("0% vs last month");
  });

  it("says so plainly when there's no baseline", () => {
    expect(formatDelta(500, 0)).toBe("no last month to compare");
  });
});

describe("buildRevenueSeries", () => {
  it("always returns 7 consecutive days ending on the anchor day", () => {
    const bars = buildRevenueSeries(new Map(), "2026-07-30");
    expect(bars).toHaveLength(7);
    expect(bars.map((b) => b.dayKey)).toEqual([
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
    ]);
  });

  it("zero-fills days the query returned no row for", () => {
    // The query only returns days that had revenue. Without the fill, a quiet
    // Monday would vanish and every later bar would shift left under the wrong
    // label — the chart would silently lie about which day earned what.
    const bars = buildRevenueSeries(new Map([["2026-07-28", 208000]]), "2026-07-30");
    expect(bars.map((b) => b.totalCents)).toEqual([0, 0, 0, 0, 208000, 0, 0]);
  });

  it("crosses a month boundary without producing an invalid date", () => {
    const bars = buildRevenueSeries(new Map(), "2026-03-02");
    expect(bars.map((b) => b.dayKey)).toEqual([
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });

  it("crosses a year boundary", () => {
    const bars = buildRevenueSeries(new Map(), "2027-01-02");
    expect(bars[0].dayKey).toBe("2026-12-27");
    expect(bars.at(-1)!.dayKey).toBe("2027-01-02");
  });
});

describe("dayKeyLabel", () => {
  it("labels a day key with its real weekday", () => {
    // 2026-07-30 is a Thursday. Formatted as a pure calendar date in UTC, not
    // reinterpreted in the reporting timezone — the key already identifies a
    // Manila day, so shifting it again would slide the label by one.
    expect(dayKeyLabel("2026-07-30")).toBe("Thu");
    expect(dayKeyLabel("2026-07-26")).toBe("Sun");
  });
});

describe("barHeightPercent", () => {
  it("scales against the tallest bar", () => {
    expect(barHeightPercent(200, 200)).toBe(100);
    expect(barHeightPercent(100, 200)).toBe(50);
  });

  it("gives a zero day a visible sliver instead of nothing", () => {
    // A 0%-high div renders as absent, which reads as a broken chart rather
    // than as "no sales that day".
    expect(barHeightPercent(0, 200)).toBe(2);
  });

  it("returns 0 for every bar when the whole week is empty, not NaN", () => {
    expect(barHeightPercent(0, 0)).toBe(0);
  });
});

describe("formatDate", () => {
  /**
   * The bug this replaced: every /admin and /account date was a bare
   * `toLocaleDateString()`, formatted in the runtime's locale and offset. On
   * Vercel that is UTC, while every revenue bucket is computed in
   * Asia/Manila — so a late-evening Manila order printed as the day before in
   * the table beside the chart that counted it as today.
   *
   * These assert the timezone is honoured rather than assert an exact string,
   * except where the string *is* the point. `toDayKey` is the function the
   * revenue SQL agrees with, so comparing against it is comparing against the
   * other surface directly.
   */
  it("reads a timestamp as the studio's calendar day, not the runtime's", () => {
    // 2026-08-15T23:30Z is already 2026-08-16 07:30 in Manila.
    const lateUtc = new Date("2026-08-15T23:30:00Z");
    expect(formatDate(lateUtc)).toBe("Aug 16, 2026");
    // The whole point: this agrees with the day the revenue chart buckets it in.
    expect(toDayKey(lateUtc)).toBe("2026-08-16");
  });

  it("does not shift a timestamp that is already the same day in both zones", () => {
    const midday = new Date("2026-08-15T04:00:00Z"); // 12:00 Manila
    expect(formatDate(midday)).toBe("Aug 15, 2026");
    expect(toDayKey(midday)).toBe("2026-08-15");
  });

  it("accepts the string a client component gets its prop as", () => {
    // AdminTwoFactorSection receives `totpConfirmedAt` serialized, so this has
    // to take a string and produce the identical output to the Date form —
    // which is what stops the server and client passes disagreeing.
    const iso = "2026-08-02T10:15:00Z";
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });

  it("is stable across the ambient locale, so SSR and hydration agree", () => {
    // Not a locale-independent output — a *fixed* one. If this ever varied with
    // the environment, the client component using it would hydrate mismatched.
    expect(formatDate(new Date("2026-01-05T04:00:00Z"))).toBe("Jan 5, 2026");
  });
});
