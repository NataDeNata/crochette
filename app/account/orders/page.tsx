import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/db/accounts";
import { formatPrice } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Order history",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const session = await auth();
  const orders = await getCustomerOrders(session!.user.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 26, margin: 0 }}>
        Order history
      </h1>

      {orders.length === 0 ? (
        <p style={{ fontSize: 14, color: "oklch(0.55 0.02 60)" }}>
          No orders yet — <Link href="/shop">browse the shop</Link>.
        </p>
      ) : (
        <div style={{ borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "oklch(0.97 0.01 60)" }}>
                {["Order", "Placed", "Status", "Total"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", fontWeight: 600, color: "oklch(0.45 0.02 60)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid oklch(0.93 0.01 60)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/order/${o.id}`} style={{ color: "inherit" }}>
                      {o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", color: "oklch(0.55 0.02 60)" }}>{o.createdAt.toLocaleDateString()}</td>
                  <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>{o.status}</td>
                  <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{formatPrice(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
