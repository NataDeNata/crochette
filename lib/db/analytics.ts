import { and, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, customers, orders } from "@/lib/db/schema";
import {
  REPORTING_TIME_ZONE,
  REVENUE_DAYS,
  buildRevenueSeries,
  toDayKey,
  type RevenueBar,
} from "@/lib/data/analytics";

/** Order statuses that represent money actually received.
 *
 * `pending` is excluded because it means a Payment Session exists but Xendit
 * has not confirmed payment — counting it would inflate revenue with checkouts
 * that were abandoned at the payment page. `failed` and `cancelled` are
 * excluded for the obvious reason; note `cancelled` is also the status that
 * triggers a restock (see lib/db/inventory.ts), so treating it as revenue
 * would double-count a refund as both a sale and returned stock. */
const REVENUE_STATUSES = ["paid", "shipped", "completed"] as const;

/** `paid_at` reduced to a calendar date in the studio's timezone.
 *
 * `paid_at` (not `created_at`) because revenue is recognised when Xendit
 * confirms payment, not when the order row was inserted — a checkout started
 * at 11:55pm and paid at 12:05am belongs to the second day. */
const paidDayExpr = sql<string>`(${orders.paidAt} AT TIME ZONE ${sql.raw(`'${REPORTING_TIME_ZONE}'`)})::date`;

/** Start of the current month, in the studio's timezone, as a timestamptz. */
const monthStartExpr = sql`date_trunc('month', now() AT TIME ZONE ${sql.raw(`'${REPORTING_TIME_ZONE}'`)})`;

/** Postgres `sum()` over an integer column returns bigint, which postgres.js
 * hands back as a *string* to avoid precision loss — and `null`, not 0, when no
 * rows matched. This is the first use of `sum()` in the codebase, so the
 * coercion is centralised here rather than repeated at each call site. */
function toCents(value: string | number | null): number {
  return value === null ? 0 : Number(value);
}

/** Revenue per day for the last REVENUE_DAYS days, oldest first, zero-filled.
 *
 * Grouping happens in SQL (one row per day with revenue) and the gaps are
 * filled in TS — see buildRevenueSeries for why the gaps matter. */
export async function getRevenueLast7Days(): Promise<RevenueBar[]> {
  const rows = await db
    .select({ day: paidDayExpr, totalCents: sql<string | null>`sum(${orders.totalCents})` })
    .from(orders)
    .where(
      and(
        inArray(orders.status, [...REVENUE_STATUSES]),
        isNotNull(orders.paidAt),
        // The day count is inlined via sql.raw, not bound as a parameter.
        // `date - $n` with an untyped bind is ambiguous: Postgres resolves it
        // against `date - date -> integer`, coercing the parameter to a date,
        // so the surrounding comparison becomes `date > integer` and errors
        // with 42883. Inlining makes it an integer literal. Safe to raw —
        // REVENUE_DAYS is a module constant, never user input.
        sql`${paidDayExpr} >= (now() AT TIME ZONE ${sql.raw(`'${REPORTING_TIME_ZONE}'`)})::date - ${sql.raw(String(REVENUE_DAYS - 1))}`,
      ),
    )
    .groupBy(paidDayExpr);

  const totalsByDay = new Map(rows.map((r) => [String(r.day).slice(0, 10), toCents(r.totalCents)]));
  return buildRevenueSeries(totalsByDay, toDayKey(new Date()));
}

export type MonthOverMonth = {
  revenueCents: number;
  prevRevenueCents: number;
  orderCount: number;
  prevOrderCount: number;
};

/** This calendar month vs the previous one, for the dashboard's KPI deltas.
 *
 * One query with four conditional aggregates rather than four round trips, and
 * the WHERE narrows to the two months involved so the aggregates never scan
 * the whole orders table. Both windows are half-open on the month boundary, so
 * an order paid at exactly midnight on the 1st lands in exactly one of them. */
export async function getMonthOverMonth(): Promise<MonthOverMonth> {
  const paidLocal = sql`(${orders.paidAt} AT TIME ZONE ${sql.raw(`'${REPORTING_TIME_ZONE}'`)})`;
  const thisMonth = sql`${paidLocal} >= ${monthStartExpr}`;
  const lastMonth = sql`${paidLocal} >= ${monthStartExpr} - interval '1 month' and ${paidLocal} < ${monthStartExpr}`;

  const [row] = await db
    .select({
      revenueCents: sql<string | null>`sum(${orders.totalCents}) filter (where ${thisMonth})`,
      prevRevenueCents: sql<string | null>`sum(${orders.totalCents}) filter (where ${lastMonth})`,
      orderCount: sql<string | null>`count(*) filter (where ${thisMonth})`,
      prevOrderCount: sql<string | null>`count(*) filter (where ${lastMonth})`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, [...REVENUE_STATUSES]),
        isNotNull(orders.paidAt),
        sql`${paidLocal} >= ${monthStartExpr} - interval '1 month'`,
      ),
    );

  return {
    revenueCents: toCents(row?.revenueCents ?? null),
    prevRevenueCents: toCents(row?.prevRevenueCents ?? null),
    orderCount: toCents(row?.orderCount ?? null),
    prevOrderCount: toCents(row?.prevOrderCount ?? null),
  };
}

export type CustomerListRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  paidOrderCount: number;
  totalSpentCents: number;
};

/** One page of registered customers with their lifetime totals.
 *
 * IMPORTANT — these totals cover account-linked orders only. `orders.customer_id`
 * is NULL for guest checkout and is never backfilled (Cro_Documentation.md §5),
 * so a person who bought as a guest before signing up shows those orders
 * nowhere here. The alternative — grouping by `customer_email` — would capture
 * guests but wouldn't map to a `customers` row with a stable id to link a
 * detail page to, so the limitation is surfaced in the UI instead of being
 * engineered around.
 *
 * LEFT JOIN, with the status filter in the join condition rather than the
 * WHERE: an inner join (or a WHERE on `orders.status`) would drop customers who
 * have never completed a purchase, and "signed up but hasn't ordered" is
 * exactly what the studio owner wants to see.
 *
 * Paginated at the DB with LIMIT/OFFSET plus a separate count(), matching the
 * pattern the other admin lists use. */
export async function listCustomersWithTotals({
  page: requestedPage,
  pageSize,
  q,
}: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<{ rows: CustomerListRow[]; total: number; page: number; totalPages: number }> {
  const where = q
    ? or(ilike(customers.name, `%${q}%`), ilike(customers.email, `%${q}%`))
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(customers).where(where);

  // Clamped here rather than by the caller. The other admin lists clamp in the
  // page component because they own their own count query; this one hides the
  // count, so a caller couldn't clamp without either a second round trip or a
  // throwaway first query. Returning the effective page keeps ?page=999
  // landing on the last real page instead of an empty table.
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);

  const totalSpentExpr = sql<string | null>`coalesce(sum(${orders.totalCents}), 0)`;

  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
      createdAt: customers.createdAt,
      paidOrderCount: sql<string>`count(${orders.id})`,
      totalSpentCents: totalSpentExpr,
    })
    .from(customers)
    .leftJoin(
      orders,
      and(eq(orders.customerId, customers.id), inArray(orders.status, [...REVENUE_STATUSES])),
    )
    .where(where)
    .groupBy(customers.id)
    // Biggest spenders first, since that's the question this page answers.
    // createdAt is the tiebreak: without a total ordering, LIMIT/OFFSET can
    // return the same row on two different pages.
    .orderBy(desc(totalSpentExpr), desc(customers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    total,
    page,
    totalPages,
    rows: rows.map((r) => ({
      ...r,
      paidOrderCount: Number(r.paidOrderCount),
      totalSpentCents: toCents(r.totalSpentCents),
    })),
  };
}

/** Everything the customer detail page shows. Read-only: the admin never
 * mutates a customer record, so there is no Server Action to go with this. */
export async function getCustomerDetail(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) return null;

  // Every status here, not just REVENUE_STATUSES — the owner opening a customer
  // wants to see a pending or cancelled order too. The *totals* below stay
  // restricted to real revenue.
  const [customerOrders, savedAddresses] = await Promise.all([
    db.select().from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)),
    db.select().from(addresses).where(eq(addresses.customerId, id)).orderBy(desc(addresses.isDefault)),
  ]);

  const paidOrders = customerOrders.filter((o) =>
    (REVENUE_STATUSES as readonly string[]).includes(o.status),
  );

  return {
    customer,
    orders: customerOrders,
    addresses: savedAddresses,
    paidOrderCount: paidOrders.length,
    totalSpentCents: paidOrders.reduce((sum, o) => sum + o.totalCents, 0),
  };
}
