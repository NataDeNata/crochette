import Link from "next/link";
import { desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.55 0.12 60)",
  paid: "oklch(0.55 0.12 150)",
  failed: "oklch(0.5 0.18 25)",
  shipped: "oklch(0.5 0.1 260)",
  completed: "oklch(0.5 0.02 60)",
  cancelled: "oklch(0.5 0.02 60)",
};

export default async function AdminOrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const itemCounts = await db
    .select({ orderId: orderItems.orderId, itemCount: count() })
    .from(orderItems)
    .groupBy(orderItems.orderId);
  const countByOrder = new Map(itemCounts.map((r) => [r.orderId, r.itemCount]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
        Orders
      </h1>

      <div style={{ borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", overflow: "hidden", background: "oklch(1 0 0)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "oklch(0.97 0.01 60)" }}>
              {["Customer", "Items", "Total", "Status", "Placed"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontWeight: 600, color: "oklch(0.45 0.02 60)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid oklch(0.93 0.01 60)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <Link href={`/admin/orders/${r.id}`} style={{ color: "inherit" }}>
                    <strong style={{ fontWeight: 500 }}>{r.customerName}</strong>
                    <div style={{ fontSize: 12, color: "oklch(0.55 0.02 60)" }}>{r.customerEmail}</div>
                  </Link>
                </td>
                <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{countByOrder.get(r.id) ?? 0}</td>
                <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{formatPrice(r.totalCents)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ color: STATUS_COLORS[r.status] ?? "inherit", textTransform: "capitalize" }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "oklch(0.55 0.02 60)" }}>
                  {r.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 16px", textAlign: "center", color: "oklch(0.5 0.02 60)" }}>
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
