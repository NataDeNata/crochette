import type { Metadata } from "next";
import { createDiscount } from "@/app/admin/discounts/actions";
import { DiscountForm } from "@/components/admin/DiscountForm";

export const metadata: Metadata = { title: "New discount code", robots: { index: false, follow: false } };

export default function NewDiscountPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="font-serif text-3xl font-medium">New discount code</h1>
      <DiscountForm action={createDiscount} submitLabel="Create code" />
    </div>
  );
}
