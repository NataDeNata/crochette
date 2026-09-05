import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createDiscount } from "@/app/admin/discounts/actions";
import { DiscountForm } from "@/components/admin/DiscountForm";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminPage } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "New discount code", robots: { index: false, follow: false } };

export default async function NewDiscountPage() {
  await requireAdminPage();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <AdminPageHeader
        title="New discount code"
        actions={
          <Button href="/admin/discounts" variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" aria-hidden />
            All codes
          </Button>
        }
      />
      <DiscountForm action={createDiscount} submitLabel="Create code" />
    </div>
  );
}
