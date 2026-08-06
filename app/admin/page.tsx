import Link from "next/link";
import { count, eq, desc } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  Package,
  ShoppingBag,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { products, customOrderRequests, orders, discountCodes } from "@/lib/db/schema";
import { lowStockCondition } from "@/lib/db/inventory";
import { getMonthOverMonth, getRevenueLast7Days } from "@/lib/db/analytics";
import { formatDelta } from "@/lib/data/analytics";
import { formatPrice } from "@/lib/data/products";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminStatusTag } from "@/components/admin/AdminStatusTag";
import { RevenueChart } from "@/components/admin/RevenueChart";

export default async function AdminDashboardPage() {
  const [
    [{ productCount }],
    [{ activeProductCount }],
    [{ lowStockCount }],
    [{ newRequestCount }],
    [{ newOrderCount }],
    [{ activeDiscountCount }],
    pendingQuotes,
    recentOrders,
    revenueBars,
    mom,
  ] = await Promise.all([
    db.select({ productCount: count() }).from(products),
    db.select({ activeProductCount: count() }).from(products).where(eq(products.status, "active")),
    db.select({ lowStockCount: count() }).from(products).where(lowStockCondition),
    db.select({ newRequestCount: count() }).from(customOrderRequests).where(eq(customOrderRequests.status, "new")),
    db.select({ newOrderCount: count() }).from(orders).where(eq(orders.status, "paid")),
    db.select({ activeDiscountCount: count() }).from(discountCodes).where(eq(discountCodes.active, true)),
    // "Needs a quote" is specifically the unreviewed queue, so this filters on
    // status = 'new' rather than showing the 5 most recent of any status as the
    // old "Recent custom order requests" panel did — a panel headed "needs a
    // quote" that lists already-quoted requests is simply wrong.
    db
      .select({
        id: customOrderRequests.id,
        name: customOrderRequests.name,
        pieceType: customOrderRequests.pieceType,
      })
      .from(customOrderRequests)
      .where(eq(customOrderRequests.status, "new"))
      .orderBy(desc(customOrderRequests.createdAt))
      .limit(5),
    db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        totalCents: orders.totalCents,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5),
    getRevenueLast7Days(),
    getMonthOverMonth(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <AdminPageHeader title="Overview" subtitle="Your shop at a glance" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <AdminStatCard
          icon={TrendingUp}
          label="Revenue this month"
          value={formatPrice(mom.revenueCents)}
          meta={formatDelta(mom.revenueCents, mom.prevRevenueCents)}
        />
        <AdminStatCard
          icon={ShoppingBag}
          label="Paid orders this month"
          value={mom.orderCount}
          meta={formatDelta(mom.orderCount, mom.prevOrderCount)}
        />
        <AdminStatCard
          icon={ShoppingBag}
          label="Awaiting fulfillment"
          value={newOrderCount}
          meta="paid, not yet shipped"
          href="/admin/orders?status=paid"
          tone={newOrderCount > 0 ? "destructive" : "default"}
        />
        <AdminStatCard
          icon={Clock}
          label="New custom requests"
          value={newRequestCount}
          meta="awaiting review"
          href="/admin/custom-orders?status=new"
          tone={newRequestCount > 0 ? "destructive" : "default"}
        />
        {/* Amber, not destructive: the two tiles above mean "a customer is
            waiting on you", this one means "plan a restock" — a different
            urgency, matching the row badge on /admin/products. */}
        <AdminStatCard
          icon={AlertTriangle}
          label="Products running low"
          value={lowStockCount}
          meta="at or below their alert level"
          href="/admin/products?stock=low"
          tone={lowStockCount > 0 ? "warning" : "default"}
        />
        <AdminStatCard
          icon={Package}
          label="Products"
          value={productCount}
          meta={`${activeProductCount} active`}
          href="/admin/products"
        />
        <AdminStatCard
          icon={Ticket}
          label="Active discount codes"
          value={activeDiscountCount}
          meta="currently redeemable"
          href="/admin/discounts"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent>
            <RevenueChart bars={revenueBars} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2.5">
            <div className="flex items-center">
              <h2 className="m-0 font-serif text-lg font-medium">Needs a quote</h2>
              {pendingQuotes.length > 0 ? (
                <Button href="/admin/custom-orders?status=new" variant="ghost" size="sm" className="ml-auto">
                  View all
                  <ArrowRight className="size-3.5" aria-hidden />
                </Button>
              ) : null}
            </div>
            {pendingQuotes.length === 0 ? (
              <p className="m-0 py-2 text-sm text-muted-foreground">
                All caught up. No requests waiting on a quote.
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {pendingQuotes.map((r) => (
                  <Link
                    key={r.id}
                    href={`/admin/custom-orders/${r.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-inherit transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{r.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.pieceType}</div>
                    </div>
                    <ChevronRight className="size-4 flex-none text-muted-foreground" aria-hidden />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="flex items-center px-4 pt-4">
            <h2 className="m-0 font-serif text-lg font-medium">Recent orders</h2>
            <Button href="/admin/orders" variant="ghost" size="sm" className="ml-auto">
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <p className="m-0 px-4 py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Customer</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-4 font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="text-inherit hover:underline">
                        {o.customerName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatPrice(o.totalCents)}</TableCell>
                    <TableCell className="pr-4">
                      <AdminStatusTag status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
