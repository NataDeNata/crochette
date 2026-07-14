import Link from "next/link";
import { count, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, customOrderRequests, orders } from "@/lib/db/schema";

const cardStyle = {
  padding: 24,
  borderRadius: 20,
  background: "oklch(1 0 0)",
  border: "1.5px solid oklch(0.9 0.02 60)",
} as const;

export default async function AdminDashboardPage() {
  const [[{ productCount }], [{ activeProductCount }], [{ newRequestCount }], [{ newOrderCount }], recentRequests] = await Promise.all([
    db.select({ productCount: count() }).from(products),
    db.select({ activeProductCount: count() }).from(products).where(eq(products.status, "active")),
    db.select({ newRequestCount: count() }).from(customOrderRequests).where(eq(customOrderRequests.status, "new")),
    db.select({ newOrderCount: count() }).from(orders).where(eq(orders.status, "paid")),
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
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 960 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
        Dashboard
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", marginBottom: 6 }}>Products</div>
          <div style={{ fontSize: 30, fontWeight: 500 }}>{productCount}</div>
          <div style={{ fontSize: 12.5, color: "oklch(0.55 0.02 60)" }}>{activeProductCount} active</div>
        </div>
        <Link href="/admin/custom-orders" style={{ ...cardStyle, display: "block" }}>
          <div style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", marginBottom: 6 }}>New custom order requests</div>
          <div style={{ fontSize: 30, fontWeight: 500, color: newRequestCount > 0 ? "oklch(0.5 0.18 25)" : undefined }}>
            {newRequestCount}
          </div>
          <div style={{ fontSize: 12.5, color: "oklch(0.55 0.02 60)" }}>awaiting review</div>
        </Link>
        <Link href="/admin/orders" style={{ ...cardStyle, display: "block" }}>
          <div style={{ fontSize: 13, color: "oklch(0.5 0.02 60)", marginBottom: 6 }}>Paid orders awaiting fulfillment</div>
          <div style={{ fontSize: 30, fontWeight: 500, color: newOrderCount > 0 ? "oklch(0.5 0.18 25)" : undefined }}>
            {newOrderCount}
          </div>
          <div style={{ fontSize: 12.5, color: "oklch(0.55 0.02 60)" }}>not yet shipped</div>
        </Link>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Recent custom order requests</h2>
          <Link href="/admin/custom-orders" style={{ fontSize: 13, color: "oklch(0.5 0.05 20)" }}>
            View all →
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "oklch(0.5 0.02 60)" }}>No requests yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recentRequests.map((r) => (
              <Link
                key={r.id}
                href={`/admin/custom-orders/${r.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 4px",
                  borderBottom: "1px solid oklch(0.93 0.01 60)",
                  fontSize: 13.5,
                }}
              >
                <span>
                  <strong style={{ fontWeight: 500 }}>{r.name}</strong>
                  <span style={{ color: "oklch(0.5 0.02 60)" }}> — {r.pieceType}</span>
                </span>
                <span style={{ color: "oklch(0.5 0.02 60)", textTransform: "capitalize" }}>{r.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
