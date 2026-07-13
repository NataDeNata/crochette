"use server";

import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { customOrderSchema } from "@/lib/validation/custom-order";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/validation/photos";
import type { FormActionState } from "@/lib/actions/types";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80);
}

async function uploadPhotos(files: File[]): Promise<{ urls: string[] } | { error: string }> {
  if (files.length > MAX_PHOTOS) {
    return { error: `Attach up to ${MAX_PHOTOS} photos.` };
  }
  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: "Photos must be JPG, PNG, or WebP." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Each photo must be 5MB or smaller." };
    }
  }

  const uploads = await Promise.all(
    files.map((file) =>
      put(`custom-orders/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`, file, {
        access: "public",
      })
    )
  );
  return { urls: uploads.map((u) => u.url) };
}

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
    budgetRange: formData.get("budgetRange") || undefined,
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  const uploadResult = await uploadPhotos(photoFiles);
  if ("error" in uploadResult) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: { photos: [uploadResult.error] },
    };
  }

  try {
    await db.insert(customOrderRequests).values({
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
