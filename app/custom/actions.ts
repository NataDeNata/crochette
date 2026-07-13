"use server";

import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { customOrderSchema } from "@/lib/validation/custom-order";
import type { FormActionState } from "@/lib/actions/types";

export async function submitCustomOrder(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = customOrderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    pieceType: formData.get("pieceType"),
    preferredSize: formData.get("preferredSize"),
    preferredColors: formData.get("preferredColors"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.insert(customOrderRequests).values({
      name: parsed.data.name,
      email: parsed.data.email,
      pieceType: parsed.data.pieceType,
      preferredSize: parsed.data.preferredSize || null,
      preferredColors: parsed.data.preferredColors || null,
      description: parsed.data.description,
    });
  } catch (err) {
    console.error("submitCustomOrder failed:", err);
    return {
      status: "error",
      message: "We couldn't send your request right now — please try again in a moment.",
    };
  }

  return {
    status: "success",
    message: "Thank you! We'll review your request and follow up by email with a quote.",
  };
}
