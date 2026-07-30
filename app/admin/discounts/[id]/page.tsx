import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema";
import { updateDiscount } from "@/app/admin/discounts/actions";
import { DiscountForm } from "@/components/admin/DiscountForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const metadata: Metadata = { title: "Edit discount code", robots: { index: false, follow: false } };

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(discountCodes).where(eq(discountCodes.id, id)).limit(1);
  if (!row) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <AdminPageHeader
        title="Edit discount code"
        subtitle={row.code}
        actions={
          <Button href="/admin/discounts" variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" aria-hidden />
            All codes
          </Button>
        }
      />
      <DiscountForm
        action={updateDiscount.bind(null, id)}
        submitLabel="Save changes"
        defaults={{
          code: row.code,
          description: row.description ?? "",
          type: row.type,
          value: row.type === "fixed" ? (row.value / 100).toString() : row.value.toString(),
          active: row.active,
          maxUses: row.maxUses?.toString() ?? "",
          minSubtotalDollars: row.minSubtotalCents != null ? (row.minSubtotalCents / 100).toString() : "",
          expiresAt: row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : "",
        }}
      />
    </div>
  );
}
