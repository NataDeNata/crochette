import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";

const STATUS_COLORS: Record<string, string> = {
  new: "oklch(0.5 0.18 25)",
  quoted: "oklch(0.55 0.12 60)",
  accepted: "oklch(0.55 0.12 150)",
  in_production: "oklch(0.55 0.12 150)",
  shipped: "oklch(0.5 0.1 260)",
  completed: "oklch(0.5 0.02 60)",
  declined: "oklch(0.5 0.02 60)",
};

export default async function AdminCustomOrdersPage() {
  const rows = await db.select().from(customOrderRequests).orderBy(desc(customOrderRequests.createdAt));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
        Custom order requests
      </h1>

      <div style={{ borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", overflow: "hidden", background: "oklch(1 0 0)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "oklch(0.97 0.01 60)" }}>
              {["Name", "Piece type", "Budget", "Photos", "Status", "Submitted"].map((h) => (
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
                  <Link href={`/admin/custom-orders/${r.id}`} style={{ color: "inherit" }}>
                    <strong style={{ fontWeight: 500 }}>{r.name}</strong>
                    <div style={{ fontSize: 12, color: "oklch(0.55 0.02 60)" }}>{r.email}</div>
                  </Link>
                </td>
                <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{r.pieceType}</td>
                <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{r.budgetRange || "—"}</td>
                <td style={{ padding: "12px 16px", color: "oklch(0.5 0.02 60)" }}>{r.referenceImageUrls?.length ?? 0}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ color: STATUS_COLORS[r.status] ?? "inherit", textTransform: "capitalize" }}>
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "oklch(0.55 0.02 60)" }}>
                  {r.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "24px 16px", textAlign: "center", color: "oklch(0.5 0.02 60)" }}>
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
