import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomOrderUpdateForm } from "@/components/admin/CustomOrderUpdateForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusTag } from "@/components/admin/AdminStatusTag";
import { DetailBlock, DetailDivider, DetailRow } from "@/components/admin/AdminDetail";

export default async function CustomOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await db.select().from(customOrderRequests).where(eq(customOrderRequests.id, id)).limit(1);
  if (!r) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <AdminPageHeader
        title={r.name}
        subtitle={r.email}
        actions={
          <>
            <AdminStatusTag status={r.status} />
            <Button href="/admin/custom-orders" variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" aria-hidden />
              All requests
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <DetailRow label="Piece type">{r.pieceType}</DetailRow>
            <DetailRow label="Size">{r.preferredSize || "—"}</DetailRow>
            <DetailRow label="Colors">{r.preferredColors || "—"}</DetailRow>
            <DetailRow label="Budget">{r.budgetRange || "—"}</DetailRow>

            <DetailDivider />

            <DetailBlock label="Description">
              <span className="whitespace-pre-wrap">{r.description}</span>
            </DetailBlock>

            <DetailDivider />

            <DetailBlock label="Reference photos">
              {r.referenceImageUrls && r.referenceImageUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {r.referenceImageUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- external Vercel Blob URL */}
                      <img
                        src={url}
                        alt="Reference"
                        className="size-24 rounded-md border border-border object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                "None attached."
              )}
            </DetailBlock>

            <p className="m-0 text-[13px] text-muted-foreground">
              Submitted {r.createdAt.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CustomOrderUpdateForm
              id={r.id}
              status={r.status}
              quotedPriceDollars={r.quotedPriceCents != null ? (r.quotedPriceCents / 100).toFixed(2) : ""}
              adminNotes={r.adminNotes ?? ""}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
