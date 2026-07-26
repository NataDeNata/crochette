import Link from "next/link";
import { count, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, customOrderRequests, orders, discountCodes } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const [
    [{ productCount }],
    [{ activeProductCount }],
    [{ newRequestCount }],
    [{ newOrderCount }],
    [{ activeDiscountCount }],
    recentRequests,
  ] = await Promise.all([
    db.select({ productCount: count() }).from(products),
    db.select({ activeProductCount: count() }).from(products).where(eq(products.status, "active")),
    db.select({ newRequestCount: count() }).from(customOrderRequests).where(eq(customOrderRequests.status, "new")),
    db.select({ newOrderCount: count() }).from(orders).where(eq(orders.status, "paid")),
    db.select({ activeDiscountCount: count() }).from(discountCodes).where(eq(discountCodes.active, true)),
    db
      .select({
        id: customOrderRequests.id,
        name: customOrderRequests.name,
        pieceType: customOrderRequests.pieceType,
        status: customOrderRequests.status,
        createdAt: customOrderRequests.createdAt,
      })
      .from(customOrderRequests)
      .orderBy(desc(customOrderRequests.createdAt))
      .limit(5),
  ]);

  return (
    <div className="flex max-w-4xl flex-col gap-7">
      <h1 className="font-serif text-3xl font-medium">Dashboard</h1>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Card>
          <CardContent>
            <div className="mb-1.5 text-[13px] text-muted-foreground">Products</div>
            <div className="text-3xl font-medium">{productCount}</div>
            <div className="text-xs text-muted-foreground">{activeProductCount} active</div>
          </CardContent>
        </Card>

        <Link href="/admin/custom-orders">
          <Card className="transition-shadow hover:shadow-sm">
            <CardContent>
              <div className="mb-1.5 text-[13px] text-muted-foreground">New custom order requests</div>
              <div className={`text-3xl font-medium ${newRequestCount > 0 ? "text-destructive" : ""}`}>
                {newRequestCount}
              </div>
              <div className="text-xs text-muted-foreground">awaiting review</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/orders">
          <Card className="transition-shadow hover:shadow-sm">
            <CardContent>
              <div className="mb-1.5 text-[13px] text-muted-foreground">Paid orders awaiting fulfillment</div>
              <div className={`text-3xl font-medium ${newOrderCount > 0 ? "text-destructive" : ""}`}>{newOrderCount}</div>
              <div className="text-xs text-muted-foreground">not yet shipped</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/discounts">
          <Card className="transition-shadow hover:shadow-sm">
            <CardContent>
              <div className="mb-1.5 text-[13px] text-muted-foreground">Active discount codes</div>
              <div className="text-3xl font-medium">{activeDiscountCount}</div>
              <div className="text-xs text-muted-foreground">currently redeemable</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent custom order requests</h2>
            <Link href="/admin/custom-orders" className="text-[13px] text-[oklch(0.5_0.05_20)]">
              View all →
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {recentRequests.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/custom-orders/${r.id}`}
                  className="flex justify-between border-b border-border/60 py-2.5 text-[13.5px] last:border-b-0"
                >
                  <span>
                    <strong className="font-medium">{r.name}</strong>
                    <span className="text-muted-foreground"> — {r.pieceType}</span>
                  </span>
                  <span className="capitalize text-muted-foreground">{r.status}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
