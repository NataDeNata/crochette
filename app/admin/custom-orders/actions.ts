"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { customOrderUpdateSchema } from "@/lib/validation/custom-order-admin";
import { invalidFields, type FormActionState } from "@/lib/actions/types";
import { blankToCents } from "@/lib/validation/coerce";
import { logError } from "@/lib/observability/log";
import { requireAdmin } from "@/lib/auth-guard";

export async function updateCustomOrder(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireAdmin();

  const parsed = customOrderUpdateSchema.safeParse({
    status: formData.get("status"),
    quotedPriceDollars: formData.get("quotedPriceDollars") || undefined,
    adminNotes: formData.get("adminNotes") || undefined,
  });

  if (!parsed.success) return invalidFields(parsed.error);

  try {
    await db
      .update(customOrderRequests)
      .set({
        status: parsed.data.status,
        quotedPriceCents: blankToCents(parsed.data.quotedPriceDollars),
        adminNotes: parsed.data.adminNotes || null,
      })
      .where(eq(customOrderRequests.id, id));
  } catch (err) {
    logError("admin.custom_order.update_failed", err, { customOrderId: id });
    return { status: "error", message: "Couldn't save changes. Please try again." };
  }

  revalidatePath(`/admin/custom-orders/${id}`);
  revalidatePath("/admin/custom-orders");
  revalidatePath("/admin");
  redirect("/admin/custom-orders");
}
