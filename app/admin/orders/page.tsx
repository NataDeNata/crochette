import Link from "next/link";
import { desc, count, eq, ilike, or, and, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { AdminFilterTabs } from "@/components/admin/AdminFilterTabs";
import { AdminStatusTag, humanizeStatus } from "@/components/admin/AdminStatusTag";
import { containsPattern } from "@/lib/db/search";
import {
  OrdersBulkBar,
  OrdersSelectAllCheckbox,
  OrderRowCheckbox,
  OrdersSelectionProvider,
} from "@/components/admin/OrdersBulkSelection";

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
  if (q) {
    const pattern = containsPattern(q);
    conditions.push(or(ilike(orders.customerName, pattern), ilike(orders.customerEmail, pattern))!);
  }
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <AdminPageHeader
        title="Orders"
        subtitle="All customer orders"
        actions={
          <AdminSearchBar
            basePath="/admin/orders"
            q={q}
            searchPlaceholder="Search by customer name or email…"
            hiddenParams={{ status: status || undefined }}
          />
        }
      />

      <AdminFilterTabs
        basePath="/admin/orders"
        param="status"
        current={status}
        params={{ q: q || undefined }}
        options={[
          { label: "All" },
          ...ORDER_STATUSES.map((s) => ({ value: s, label: humanizeStatus(s) })),
        ]}
      />

      {/* Wraps the table *and* the bar so both read the same selection. The
          table below stays a Server Component — only the checkboxes and the bar
          are client. */}
      <OrdersSelectionProvider pageIds={rows.map((r) => r.id)}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <OrdersSelectAllCheckbox />
                    <span className="sr-only">Select all</span>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4">
                      <OrderRowCheckbox id={r.id} label={r.customerName} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/orders/${r.id}`} className="text-inherit">
                        <strong className="font-medium">{r.customerName}</strong>
                        <div className="text-[13px] text-muted-foreground">{r.customerEmail}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{countByOrder.get(r.id) ?? 0}</TableCell>
                    <TableCell>{formatPrice(r.totalCents)}</TableCell>
                    <TableCell>
                      <AdminStatusTag status={r.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button href={`/admin/orders/${r.id}`} variant="outline" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                      {q || status ? "No orders match your search." : "No orders yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <OrdersBulkBar />
      </OrdersSelectionProvider>

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
