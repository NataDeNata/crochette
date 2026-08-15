"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { discountCodes, orders } from "@/lib/db/schema";
import { discountSchema } from "@/lib/validation/discount";
import { invalidFields, type FormActionState } from "@/lib/actions/types";
import { isUniqueViolation } from "@/lib/db/errors";
import { blankToCents, blankToNull } from "@/lib/validation/coerce";
import { logError } from "@/lib/observability/log";

function parseDiscountForm(formData: FormData) {
  return discountSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    value: formData.get("value"),
    active: formData.get("active") === "true",
    maxUses: formData.get("maxUses") || undefined,
    minSubtotalDollars: formData.get("minSubtotalDollars") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });
}

function toRow(data: ReturnType<typeof discountSchema.parse>) {
  return {
    code: data.code,
    description: data.description || null,
    type: data.type,
    value: data.type === "fixed" ? Math.round(data.value * 100) : Math.round(data.value),
    active: data.active,
    maxUses: blankToNull(data.maxUses),
    minSubtotalCents: blankToCents(data.minSubtotalDollars),
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  };
}

export async function createDiscount(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const parsed = parseDiscountForm(formData);
  if (!parsed.success) return invalidFields(parsed.error);

  try {
    await db.insert(discountCodes).values(toRow(parsed.data));
  } catch (err) {
    logError("admin.discount.create_failed", err);
    const message = isUniqueViolation(err) ? "That code is already in use." : "Couldn't create the discount code. Please try again.";
    return { status: "error", message };
  }

  revalidatePath("/admin/discounts");
  redirect("/admin/discounts");
}

export async function updateDiscount(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = parseDiscountForm(formData);
  if (!parsed.success) return invalidFields(parsed.error);

  try {
    await db.update(discountCodes).set(toRow(parsed.data)).where(eq(discountCodes.id, id));
  } catch (err) {
    logError("admin.discount.update_failed", err, { discountCodeId: id });
    const message = isUniqueViolation(err) ? "That code is already in use." : "Couldn't save the discount code. Please try again.";
    return { status: "error", message };
  }

  revalidatePath("/admin/discounts");
  redirect("/admin/discounts");
}

export async function deleteDiscount(id: string, _prevState: FormActionState, _formData: FormData): Promise<FormActionState> {
  const [existingOrder] = await db.select({ id: orders.id }).from(orders).where(eq(orders.discountCodeId, id)).limit(1);

  if (existingOrder) {
    return {
      status: "error",
      message: 'This code has been used on an order and can’t be deleted. Set it to inactive instead.',
    };
  }

  try {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
  } catch (err) {
    logError("admin.discount.delete_failed", err, { discountCodeId: id });
    return { status: "error", message: "Couldn't delete the discount code. Please try again." };
  }

  revalidatePath("/admin/discounts");
  return { status: "success", message: "Deleted." };
}
