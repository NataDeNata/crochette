"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { discountCodes, orders } from "@/lib/db/schema";
import { discountSchema } from "@/lib/validation/discount";
import type { FormActionState } from "@/lib/actions/types";
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
    maxUses: data.maxUses === "" || data.maxUses === undefined ? null : data.maxUses,
    minSubtotalCents:
      data.minSubtotalDollars === "" || data.minSubtotalDollars === undefined
        ? null
        : Math.round(data.minSubtotalDollars * 100),
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  };
}

export async function createDiscount(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const parsed = parseDiscountForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "Please check the fields below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.insert(discountCodes).values(toRow(parsed.data));
  } catch (err) {
    logError("admin.discount.create_failed", err);
    const message = err instanceof Error && err.message.includes("unique") ? "That code is already in use." : "Couldn't create the discount code — please try again.";
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
  if (!parsed.success) {
    return { status: "error", message: "Please check the fields below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.update(discountCodes).set(toRow(parsed.data)).where(eq(discountCodes.id, id));
  } catch (err) {
    logError("admin.discount.update_failed", err, { discountCodeId: id });
    const message = err instanceof Error && err.message.includes("unique") ? "That code is already in use." : "Couldn't save the discount code — please try again.";
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
      message: 'This code has been used on an order and can’t be deleted — set it to inactive instead.',
    };
  }

  try {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
  } catch (err) {
    logError("admin.discount.delete_failed", err, { discountCodeId: id });
    return { status: "error", message: "Couldn't delete the discount code — please try again." };
  }

  revalidatePath("/admin/discounts");
  return { status: "success", message: "Deleted." };
}
