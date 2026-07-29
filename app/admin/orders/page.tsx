import Link from "next/link";
import { desc, count, eq, ilike, or, and, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";

const STATUS_TEXT_CLASSES: Record<string, string> = {
  pending: "text-[oklch(0.55_0.12_60)]",
  paid: "text-[oklch(0.55_0.12_150)]",
  failed: "text-[oklch(0.5_0.18_25)]",
  shipped: "text-[oklch(0.5_0.1_260)]",
  completed: "text-[oklch(0.5_0.02_60)]",
  cancelled: "text-[oklch(0.5_0.02_60)]",
};

const ORDER_STATUSES = ["pending", "paid", "failed", "shipped", "completed", "cancelled"] as const;
const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = ORDER_STATUSES.includes(sp.status as (typeof ORDER_STATUSES)[number]) ? sp.status! : "";
  const rawPage = Math.max(1, Number(sp.page) || 1);

  const conditions: SQL[] = [];
  if (q) conditions.push(or(ilike(orders.customerName, `%${q}%`), ilike(orders.customerEmail, `%${q}%`))!);
  if (status) conditions.push(eq(orders.status, status as (typeof ORDER_STATUSES)[number]));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(orders).where(where);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(rawPage, totalPages);

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const itemCounts = rows.length
    ? await db
        .select({ orderId: orderItems.orderId, itemCount: count() })
        .from(orderItems)
        .where(inArray(orderItems.orderId, rows.map((r) => r.id)))
        .groupBy(orderItems.orderId)
    : [];
  const countByOrder = new Map(itemCounts.map((r) => [r.orderId, r.itemCount]));

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <h1 className="m-0 font-serif text-3xl font-medium">Orders</h1>

      <AdminSearchBar
        basePath="/admin/orders"
        q={q}
        status={status}
        statusOptions={ORDER_STATUSES.map((s) => ({ value: s, label: s }))}
        searchPlaceholder="Search by customer name or email…"
      />

      <div className="overflow-hidden rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] bg-white">
        <table className="w-full border-collapse text-[14.5px]">
          <thead>
            <tr className="text-left bg-[oklch(0.97_0.01_60)]">
              {["Customer", "Items", "Total", "Status", "Placed"].map((h) => (
                <th key={h} className="py-3 px-4 font-semibold text-[oklch(0.45_0.02_60)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[oklch(0.93_0.01_60)]">
                <td className="py-3 px-4">
                  <Link href={`/admin/orders/${r.id}`} className="text-inherit">
                    <strong className="font-medium">{r.customerName}</strong>
                    <div className="text-sm text-[oklch(0.55_0.02_60)]">{r.customerEmail}</div>
                  </Link>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{countByOrder.get(r.id) ?? 0}</td>
                <td className="py-3 px-4 text-muted-foreground">{formatPrice(r.totalCents)}</td>
                <td className="py-3 px-4">
                  <span className={`${STATUS_TEXT_CLASSES[r.status] ?? "text-inherit"} capitalize`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-[oklch(0.55_0.02_60)]">
                  {r.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-muted-foreground">
                  {q || status ? "No orders match your search." : "No orders yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        basePath="/admin/orders"
        params={{ q: q || undefined, status: status || undefined }}
      />
    </div>
  );
}
