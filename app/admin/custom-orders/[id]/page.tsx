import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { CustomOrderUpdateForm } from "@/components/admin/CustomOrderUpdateForm";

const fieldClass = "text-[13.5px]";
const labelClass = "text-xs text-muted-foreground mb-[3px]";

export default async function CustomOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await db.select().from(customOrderRequests).where(eq(customOrderRequests.id, id)).limit(1);
  if (!r) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <div>
        <h1 className="font-serif font-medium text-3xl mb-1">{r.name}</h1>
        <a href={`mailto:${r.email}`} className="text-[13.5px] text-[oklch(0.5_0.05_20)]">
          {r.email}
        </a>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-8 items-start">
        <div className="flex flex-col gap-5 p-6 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={labelClass}>Piece type</div>
              <div className={fieldClass}>{r.pieceType}</div>
            </div>
            <div>
              <div className={labelClass}>Size</div>
              <div className={fieldClass}>{r.preferredSize || "—"}</div>
            </div>
            <div>
              <div className={labelClass}>Colors</div>
              <div className={fieldClass}>{r.preferredColors || "—"}</div>
            </div>
            <div>
              <div className={labelClass}>Budget</div>
              <div className={fieldClass}>{r.budgetRange || "—"}</div>
            </div>
          </div>

          <div>
            <div className={labelClass}>Description</div>
            <div className={`${fieldClass} leading-[1.6] whitespace-pre-wrap`}>{r.description}</div>
          </div>

          <div>
            <div className={labelClass}>Reference photos</div>
            {r.referenceImageUrls && r.referenceImageUrls.length > 0 ? (
              <div className="flex gap-2.5 flex-wrap mt-1.5">
                {r.referenceImageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external Vercel Blob URL */}
                    <img
                      src={url}
                      alt="Reference"
                      className="w-24 h-24 rounded-[10px] object-cover border-[1.5px] border-[oklch(0.9_0.02_60)]"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className={fieldClass}>None attached.</div>
            )}
          </div>

          <div className="text-xs text-[oklch(0.55_0.02_60)]">
            Submitted {r.createdAt.toLocaleString()}
          </div>
        </div>

        <div className="p-6 rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] bg-white">
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
