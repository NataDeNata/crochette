"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { orderUpdateSchema } from "@/lib/validation/order-admin";
import type { FormActionState } from "@/lib/actions/types";

export async function updateOrder(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = orderUpdateSchema.safeParse({ status: formData.get("status") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.update(orders).set({ status: parsed.data.status }).where(eq(orders.id, id));
  } catch (err) {
    console.error("updateOrder failed:", err);
    return { status: "error", message: "Couldn't save changes — please try again." };
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { status: "success", message: "Saved." };
}
