"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { customOrderUpdateSchema } from "@/lib/validation/custom-order-admin";
import type { FormActionState } from "@/lib/actions/types";

export async function updateCustomOrder(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = customOrderUpdateSchema.safeParse({
    status: formData.get("status"),
    quotedPriceDollars: formData.get("quotedPriceDollars") || undefined,
    adminNotes: formData.get("adminNotes") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Please check the fields below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(customOrderRequests)
      .set({
        status: parsed.data.status,
        quotedPriceCents:
          parsed.data.quotedPriceDollars === "" || parsed.data.quotedPriceDollars === undefined
            ? null
            : Math.round(parsed.data.quotedPriceDollars * 100),
        adminNotes: parsed.data.adminNotes || null,
      })
      .where(eq(customOrderRequests.id, id));
  } catch (err) {
    console.error("updateCustomOrder failed:", err);
    return { status: "error", message: "Couldn't save changes — please try again." };
  }

  revalidatePath(`/admin/custom-orders/${id}`);
  revalidatePath("/admin/custom-orders");
  revalidatePath("/admin");
  return { status: "success", message: "Saved." };
}
