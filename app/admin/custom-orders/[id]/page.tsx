import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { CustomOrderUpdateForm } from "@/components/admin/CustomOrderUpdateForm";

const fieldStyle = { fontSize: 13.5 } as const;
const labelStyle = { fontSize: 12, color: "oklch(0.5 0.02 60)", marginBottom: 3 } as const;

export default async function CustomOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await db.select().from(customOrderRequests).where(eq(customOrderRequests.id, id)).limit(1);
  if (!r) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: "0 0 4px" }}>
          {r.name}
        </h1>
        <a href={`mailto:${r.email}`} style={{ fontSize: 13.5, color: "oklch(0.5 0.05 20)" }}>
          {r.email}
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", background: "oklch(1 0 0)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={labelStyle}>Piece type</div>
              <div style={fieldStyle}>{r.pieceType}</div>
            </div>
            <div>
              <div style={labelStyle}>Size</div>
              <div style={fieldStyle}>{r.preferredSize || "—"}</div>
            </div>
            <div>
              <div style={labelStyle}>Colors</div>
              <div style={fieldStyle}>{r.preferredColors || "—"}</div>
            </div>
            <div>
              <div style={labelStyle}>Budget</div>
              <div style={fieldStyle}>{r.budgetRange || "—"}</div>
            </div>
          </div>

          <div>
            <div style={labelStyle}>Description</div>
            <div style={{ ...fieldStyle, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.description}</div>
          </div>

          <div>
            <div style={labelStyle}>Reference photos</div>
            {r.referenceImageUrls && r.referenceImageUrls.length > 0 ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {r.referenceImageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external Vercel Blob URL */}
                    <img
                      src={url}
                      alt="Reference"
                      style={{ width: 96, height: 96, borderRadius: 10, objectFit: "cover", border: "1.5px solid oklch(0.9 0.02 60)" }}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div style={fieldStyle}>None attached.</div>
            )}
          </div>

          <div style={{ fontSize: 12, color: "oklch(0.55 0.02 60)" }}>
            Submitted {r.createdAt.toLocaleString()}
          </div>
        </div>

        <div style={{ padding: 24, borderRadius: 16, border: "1.5px solid oklch(0.9 0.02 60)", background: "oklch(1 0 0)" }}>
          <CustomOrderUpdateForm
            id={r.id}
            status={r.status}
            quotedPriceDollars={r.quotedPriceCents != null ? (r.quotedPriceCents / 100).toFixed(2) : ""}
            adminNotes={r.adminNotes ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
