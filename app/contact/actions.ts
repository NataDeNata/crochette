"use server";

import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { contactSchema } from "@/lib/validation/contact";
import type { FormActionState } from "@/lib/actions/types";
import { notifyContactMessageSubmitted } from "@/lib/email/notifications";

export async function submitContactMessage(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.insert(contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });
  } catch (err) {
    console.error("submitContactMessage failed:", err);
    return {
      status: "error",
      message: "We couldn't send your message right now — please try again in a moment.",
    };
  }

  await notifyContactMessageSubmitted({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject || null,
    message: parsed.data.message,
  });

  return {
    status: "success",
    message: "Thanks for reaching out! We'll get back to you soon.",
  };
}
