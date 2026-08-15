"use client";

import { deleteDiscount } from "@/app/admin/discounts/actions";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

export function DeleteDiscountButton({ id, code }: { id: string; code: string }) {
  return (
    <ConfirmDeleteButton
      action={deleteDiscount.bind(null, id)}
      name={code}
      successMessage="Discount code deleted."
    />
  );
}
