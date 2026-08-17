/** Pure analytics helpers — no database, no network, safe in a client bundle.
 *
 * Split from lib/db/analytics.ts on the same principle as
 * lib/data/products.ts vs lib/data/products.server.ts: the shapes and the
 * arithmetic live in a module anything can import, the queries live behind the
 * `db` import. It also means the arithmetic is unit-testable without a
 * Postgres container (tests/unit/data/analytics.test.ts). */

/** The timezone every admin date bucket is computed in.
 *
 * Hardcoded rather than read from the server's clock: the studio is in the
 * Philippines, prices are in PHP, and "revenue today" must mean the owner's
 * today — not UTC's, and not whatever region Vercel happens to run the
 * function in. Kept here so the SQL in lib/db/analytics.ts and the label
 * formatting below can't disagree about it. */
export const REPORTING_TIME_ZONE = "Asia/Manila";

export const REVENUE_DAYS = 7;

export type RevenueBar = {
  /** `YYYY-MM-DD` in REPORTING_TIME_ZONE. */
  dayKey: string;
  /** Short weekday label for the axis, e.g. `Tue`. */
  label: string;
  totalCents: number;
};

/** Percentage change from `previous` to `current`, rounded to a whole percent.
 *
 * Returns `null` when there is no baseline to compare against, which is the
 * whole reason this is a function rather than an inline expression: on a fresh
 * database `previous` is 0, and `(x - 0) / 0` renders as `Infinity%` (or
 * `NaN%` when both are 0). Callers show a dash instead. "Up from nothing" has
 * no honest percentage. */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Human-readable delta for a stat tile: `+12% vs last month`, or a plain
 * fallback when there's no baseline. */
export function formatDelta(current: number, previous: number, period = "last month"): string {
  const pct = percentDelta(current, previous);
  if (pct === null) return `no ${period} to compare`;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs ${period}`;
}

/** `YYYY-MM-DD` for a Date, read in REPORTING_TIME_ZONE.
 *
 * `en-CA` is used purely because its short date format *is* ISO `YYYY-MM-DD`,
 * which avoids hand-assembling parts from formatToParts. */
export function toDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** A timestamp as a calendar date the studio owner would recognise.
 *
 * Every date rendered in /admin and /account used to be a bare
 * `date.toLocaleDateString()`, which formats in the *runtime's* locale and
 * offset. Two things were wrong with that, and only the second is cosmetic:
 *
 * 1. On Vercel the runtime is UTC while every revenue bucket in this file is
 *    computed in REPORTING_TIME_ZONE, eight hours ahead. An order paid at 07:00
 *    Manila counted toward one day in the dashboard's chart and printed as the
 *    day before in the orders table directly beside it. Pinning the zone here
 *    means the two surfaces cannot disagree, for the same reason
 *    REPORTING_TIME_ZONE is shared with the SQL rather than restated.
 * 2. A client component formatting a date this way renders it once on the
 *    server and again in the browser, in two different locales — a hydration
 *    mismatch. `AdminTwoFactorSection` was doing exactly that. A fixed locale
 *    makes both passes produce the same string.
 *
 * `en-PH` rather than the visitor's locale: these are studio-facing surfaces
 * reporting on Philippine operations, and a date that changes format with the
 * reader is not comparable against the chart beside it. */
export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: REPORTING_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/** Weekday label for a `YYYY-MM-DD` key.
 *
 * The key is parsed as UTC midnight and formatted in UTC, deliberately *not*
 * in REPORTING_TIME_ZONE: the key already identifies a Manila calendar day, so
 * re-interpreting it in a timezone would shift it. Treating it as a pure
 * calendar date keeps the label exact regardless of where this runs. */
export function dayKeyLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Builds the full REVENUE_DAYS-long series ending on `todayKey`, filling any
 * day with no orders as zero.
 *
 * The query only returns days that had revenue, so without this the chart
 * would silently relabel its bars — a quiet Monday would vanish and Sunday's
 * bar would slide into its place. Zero-filling keeps the axis honest and the
 * bar count fixed. */
export function buildRevenueSeries(
  totalsByDay: Map<string, number>,
  todayKey: string,
  days = REVENUE_DAYS,
): RevenueBar[] {
  const [y, m, d] = todayKey.split("-").map(Number);
  const bars: RevenueBar[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    // UTC arithmetic on a calendar date, so DST and month/year boundaries are
    // handled by Date itself rather than by hand.
    const cursor = new Date(Date.UTC(y, m - 1, d - offset));
    const dayKey = cursor.toISOString().slice(0, 10);
    bars.push({
      dayKey,
      label: dayKeyLabel(dayKey),
      totalCents: totalsByDay.get(dayKey) ?? 0,
    });
  }

  return bars;
}

/** Bar height as a percentage of the tallest bar in the series.
 *
 * Returns 0 for every bar when the whole week is empty, so a fresh database
 * renders a flat axis rather than dividing by zero. The 2% floor gives a
 * zero-revenue day a visible sliver instead of nothing at all, which reads as
 * "no sales that day" rather than as a rendering bug. */
export function barHeightPercent(totalCents: number, maxCents: number): number {
  if (maxCents <= 0) return 0;
  return Math.max(2, Math.round((totalCents / maxCents) * 100));
}
