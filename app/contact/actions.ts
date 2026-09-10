"use server";

import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { contactSchema } from "@/lib/validation/contact";
import { invalidFields, rateLimited, type FormActionState } from "@/lib/actions/types";
import { notifyContactMessageSubmitted } from "@/lib/email/notifications";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { logError } from "@/lib/observability/log";

const CONTACT_FIELDS = ["name", "email", "subject", "message"] as const;

export async function submitContactMessage(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  // Echoed back on every error path below so the form can refill itself — see
  // `FormActionState.values`'s doc comment (checkout/actions.ts has the same
  // pattern): React 19 resets an uncontrolled form action's fields on every
  // return, including an error, so without this a rejected submission wiped
  // whatever the visitor had already gotten right.
  const echo = Object.fromEntries(CONTACT_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));

  const ip = await getClientIp();
  if (await isRateLimited("contact", ip)) return rateLimited({ values: echo });

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) return invalidFields(parsed.error, { values: echo });

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
      values: echo,
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
