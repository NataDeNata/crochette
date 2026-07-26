import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerOrders, listAddresses } from "@/lib/db/accounts";
import { formatPrice } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountDashboardPage() {
  const session = await auth();
  const customerId = session!.user.id;

  const [orders, addressList] = await Promise.all([getCustomerOrders(customerId), listAddresses(customerId)]);
  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addressList.find((a) => a.isDefault) ?? addressList[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: "0 0 6px" }}>
          Welcome, {(session!.user.name ?? session!.user.email ?? "").split(" ")[0]}
        </h1>
        <p style={{ fontSize: 14, color: "oklch(0.5 0.02 60)", margin: 0 }}>{session!.user.email}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
        <div style={{ padding: 24, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)" }}>
          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 20, margin: "0 0 14px" }}>
            Recent orders
          </h2>
          {recentOrders.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "oklch(0.55 0.02 60)" }}>No orders yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/order/${o.id}`}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "inherit" }}
                >
                  <span>
                    {o.createdAt.toLocaleDateString()}{" "}
                    <span style={{ color: "oklch(0.55 0.02 60)", textTransform: "capitalize" }}>({o.status})</span>
                  </span>
                  <span>{formatPrice(o.totalCents)}</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/account/orders" style={{ display: "inline-block", marginTop: 16, fontSize: 13 }}>
            View all orders →
          </Link>
        </div>

        <div style={{ padding: 24, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)" }}>
          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 20, margin: "0 0 14px" }}>
            Default address
          </h2>
          {defaultAddress ? (
            <p style={{ fontSize: 13.5, color: "oklch(0.5 0.02 60)", lineHeight: 1.6, margin: 0 }}>
              {defaultAddress.line1}
              {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}, {defaultAddress.city}, {defaultAddress.province}{" "}
              {defaultAddress.postalCode}
            </p>
          ) : (
            <p style={{ fontSize: 13.5, color: "oklch(0.55 0.02 60)" }}>No saved addresses yet.</p>
          )}
          <Link href="/account/addresses" style={{ display: "inline-block", marginTop: 16, fontSize: 13 }}>
            Manage addresses →
          </Link>
        </div>
      </div>
    </div>
  );
}
