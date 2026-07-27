import Link from "next/link";
import { desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";

const STATUS_TEXT_CLASSES: Record<string, string> = {
  pending: "text-[oklch(0.55_0.12_60)]",
  paid: "text-[oklch(0.55_0.12_150)]",
  failed: "text-[oklch(0.5_0.18_25)]",
  shipped: "text-[oklch(0.5_0.1_260)]",
  completed: "text-[oklch(0.5_0.02_60)]",
  cancelled: "text-[oklch(0.5_0.02_60)]",
};

export default async function AdminOrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const itemCounts = await db
    .select({ orderId: orderItems.orderId, itemCount: count() })
    .from(orderItems)
    .groupBy(orderItems.orderId);
  const countByOrder = new Map(itemCounts.map((r) => [r.orderId, r.itemCount]));

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <h1 className="font-serif font-medium text-3xl m-0">Orders</h1>

      <div className="rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] overflow-hidden bg-white">
        <table className="w-full border-collapse text-[13.5px]">
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
                    <div className="text-xs text-[oklch(0.55_0.02_60)]">{r.customerEmail}</div>
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
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
