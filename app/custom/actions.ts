"use server";

import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { customOrderSchema } from "@/lib/validation/custom-order";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "@/lib/validation/photos";
import { sniffPhotoType } from "@/lib/validation/photo-sniff";
import { fieldError, invalidFields, rateLimited, type FormActionState } from "@/lib/actions/types";
import { notifyCustomOrderSubmitted } from "@/lib/email/notifications";
import { currentCustomerId } from "@/lib/auth-guard";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";
import { logError } from "@/lib/observability/log";

function sanitizeFilename(name: string) {
  const dotIndex = name.lastIndexOf(".");
  const withoutExtension = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  return withoutExtension.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80);
}

async function uploadPhotos(files: File[]): Promise<{ urls: string[] } | { error: string }> {
  if (files.length > MAX_PHOTOS) {
    return { error: `Attach up to ${MAX_PHOTOS} photos.` };
  }

  const sniffed: { file: File; contentType: string; extension: string }[] = [];
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Each photo must be 5MB or smaller." };
    }
    // Sniffed from the file's own bytes, not the client-supplied `file.type` —
    // see lib/validation/photo-sniff.ts.
    const detected = await sniffPhotoType(file);
    if (!detected) {
      return { error: "Photos must be JPG, PNG, or WebP." };
    }
    sniffed.push({ file, ...detected });
  }

  const uploads = await Promise.all(
    sniffed.map(({ file, contentType, extension }) =>
      put(`custom-orders/${crypto.randomUUID()}-${sanitizeFilename(file.name)}.${extension}`, file, {
        access: "public",
        contentType,
      })
    )
  );
  return { urls: uploads.map((u) => u.url) };
}

export async function submitCustomOrder(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const ip = await getClientIp();
  if (await isRateLimited("custom-order", ip)) return rateLimited();

  const parsed = customOrderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    pieceType: formData.get("pieceType"),
    preferredSize: formData.get("preferredSize"),
    preferredColors: formData.get("preferredColors"),
    budgetRange: formData.get("budgetRange") || undefined,
    description: formData.get("description"),
  });

  if (!parsed.success) return invalidFields(parsed.error);

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  const uploadResult = await uploadPhotos(photoFiles);
  if ("error" in uploadResult) return fieldError("photos", uploadResult.error);

  const customerId = await currentCustomerId();

  try {
    await db.insert(customOrderRequests).values({
      customerId,
      name: parsed.data.name,
      email: parsed.data.email,
      pieceType: parsed.data.pieceType,
      preferredSize: parsed.data.preferredSize || null,
      preferredColors: parsed.data.preferredColors || null,
      budgetRange: parsed.data.budgetRange || null,
      referenceImageUrls: uploadResult.urls.length ? uploadResult.urls : null,
      description: parsed.data.description,
    });
  } catch (err) {
    logError("custom_order.submit_failed", err, {
      photoCount: uploadResult.urls.length,
      pieceType: parsed.data.pieceType,
    });
    return {
      status: "error",
      message: "We couldn't send your request right now. Please try again in a moment.",
    };
  }

  await notifyCustomOrderSubmitted({
    name: parsed.data.name,
    email: parsed.data.email,
    pieceType: parsed.data.pieceType,
    preferredSize: parsed.data.preferredSize || null,
    preferredColors: parsed.data.preferredColors || null,
    budgetRange: parsed.data.budgetRange || null,
    description: parsed.data.description,
    photoCount: uploadResult.urls.length,
  });

  return {
    status: "success",
    message: "Thank you! We'll review your request and follow up by email with a quote.",
  };
}
