"use server";

import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { contactSchema } from "@/lib/validation/contact";
import { invalidFields, rateLimited, type FormActionState } from "@/lib/actions/types";
import { notifyContactMessageSubmitted } from "@/lib/email/notifications";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { logError } from "@/lib/observability/log";

export async function submitContactMessage(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const ip = await getClientIp();
  if (await isRateLimited("contact", ip)) return rateLimited();

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) return invalidFields(parsed.error);

  try {
    await db.insert(contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });
  } catch (err) {
    logError("contact.submit_failed", err);
    return {
      status: "error",
      message: "We couldn't send your message right now. Please try again in a moment.",
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
