import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema";
import { updateDiscount } from "@/app/admin/discounts/actions";
import { DiscountForm } from "@/components/admin/DiscountForm";

export const metadata: Metadata = { title: "Edit discount code", robots: { index: false, follow: false } };

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(discountCodes).where(eq(discountCodes.id, id)).limit(1);
  if (!row) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="font-serif text-3xl font-medium">Edit discount code</h1>
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
