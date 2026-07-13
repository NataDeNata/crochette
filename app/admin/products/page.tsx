import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

const STATUS_COLORS: Record<string, string> = {
  active: "oklch(0.55 0.12 150)",
  draft: "oklch(0.55 0.02 60)",
  sold_out: "oklch(0.5 0.18 25)",
};

export default async function AdminProductsPage() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
          Products
        </h1>
        <Link
          href="/admin/products/new"
          style={{
            background: "oklch(0.28 0.02 60)",
            color: "oklch(0.98 0.01 85)",
            padding: "11px 22px",
            borderRadius: 24,
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          + New product
        </Link>
      </div>

      <div style={{ borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", overflow: "hidden", background: "oklch(1 0 0)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "oklch(0.97 0.01 60)" }}>
              {["Name", "Category", "Price", "Stock", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontWeight: 600, color: "oklch(0.45 0.02 60)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid oklch(0.93 0.01 60)" }}>
                <td style={{ padding: "12px 16px" }}>{p.name}</td>
                <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{p.category}</td>
                <td style={{ padding: "12px 16px" }}>{formatPrice(p.priceCents)}</td>
                <td style={{ padding: "12px 16px" }}>{p.stockQty}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ color: STATUS_COLORS[p.status] ?? "inherit", textTransform: "capitalize" }}>
                    {p.status.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 14, justifyContent: "flex-end" }}>
                  <Link href={`/admin/products/${p.id}`} style={{ color: "oklch(0.5 0.05 20)" }}>
                    Edit
                  </Link>
                  <DeleteProductButton id={p.id} slug={p.slug} name={p.name} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "24px 16px", textAlign: "center", color: "oklch(0.5 0.02 60)" }}>
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
