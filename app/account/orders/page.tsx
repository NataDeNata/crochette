import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/db/accounts";
import { formatPrice } from "@/lib/data/products";
import { formatDate } from "@/lib/data/analytics";
import { OrderTracker } from "@/components/account/OrderTracker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Order history",
  robots: { index: false, follow: false },
};

const PENDING_STATUSES = ["pending", "paid", "shipped"];

export default async function AccountOrdersPage() {
  const session = await auth();
  const orders = await getCustomerOrders(session!.user.id);
  const pendingOrders = orders.filter((o) => PENDING_STATUSES.includes(o.status));

  return (
    <div className="flex flex-col gap-8">
      {pendingOrders.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-serif font-medium text-xl m-0">Pending orders</h2>
          <div className="flex flex-col gap-4">
            {pendingOrders.map((o) => (
              <Link
                key={o.id}
                href={`/order/${o.id}`}
                className="block p-5 rounded-[16px] border-[1.5px] border-keyline/15 text-inherit hover:border-keyline/30 transition-colors"
              >
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-sm font-medium">Order {o.id.slice(0, 8)}</span>
                  <span className="text-[13px] text-muted-foreground">{formatPrice(o.totalCents)}</span>
                </div>
                <OrderTracker status={o.status} />
                {(o.carrier || o.trackingNumber) && (
                  <div className="mt-4 text-[12.5px] text-muted-foreground">
                    {o.carrier && <>Carrier: {o.carrier}</>}
                    {o.carrier && o.trackingNumber && " · "}
                    {o.trackingNumber && <>Tracking number: {o.trackingNumber}</>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <h1 className="font-serif font-medium text-[26px] m-0">Order history</h1>

        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No orders yet. <Link href="/shop">Browse the shop</Link>.
          </p>
        ) : (
          // Was a hand-rolled <table> inside `overflow-hidden`, which clipped
          // its four columns on a narrow screen instead of letting them
          // scroll. The shared primitive already wraps itself in an
          // `overflow-x-auto` container — the same one every /admin list page
          // relies on — so the columns keep their widths and pan instead.
          <div className="rounded-[16px] border-[1.5px] border-keyline/15 overflow-hidden">
            <Table className="text-[13.5px]">
              <TableHeader>
                <TableRow className="bg-secondary">
                  {["Order", "Placed", "Status", "Total"].map((h) => (
                    <TableHead key={h} className="py-3 px-4 font-semibold text-keyline/70">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="py-3 px-4">
                      <Link href={`/order/${o.id}`} className="text-inherit">
                        {o.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="py-3 px-4 capitalize">{o.status}</TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">{formatPrice(o.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
