"use server";

import { eq, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import type { FormActionState } from "@/lib/actions/types";
import { logError } from "@/lib/observability/log";

function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
}

export async function addToGallery(
  imageId: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const [{ maxOrder } = { maxOrder: null }] = await db
    .select({ maxOrder: sql<number | null>`max(${productImages.galleryOrder})` })
    .from(productImages)
    .where(eq(productImages.galleryFeatured, true));

  try {
    await db
      .update(productImages)
      .set({ galleryFeatured: true, galleryOrder: (maxOrder ?? -1) + 1 })
      .where(eq(productImages.id, imageId));
  } catch (err) {
    logError("admin.gallery.add_failed", err, { imageId });
    return { status: "error", message: "Couldn't add that photo to the gallery. Please try again." };
  }

  revalidateGallery();
  return { status: "success" };
}

export async function removeFromGallery(
  imageId: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  try {
    await db
      .update(productImages)
      .set({ galleryFeatured: false, galleryOrder: null })
      .where(eq(productImages.id, imageId));
  } catch (err) {
    logError("admin.gallery.remove_failed", err, { imageId });
    return { status: "error", message: "Couldn't remove that photo. Please try again." };
  }

  revalidateGallery();
  return { status: "success" };
}

export async function reorderGalleryImage(
  imageId: string,
  direction: "up" | "down",
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const featured = await db
    .select({ id: productImages.id, galleryOrder: productImages.galleryOrder })
    .from(productImages)
    .where(eq(productImages.galleryFeatured, true))
    .orderBy(asc(productImages.galleryOrder));

  const index = featured.findIndex((f) => f.id === imageId);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= featured.length) {
    return { status: "success" };
  }

  const current = featured[index];
  const neighbor = featured[neighborIndex];

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(productImages)
        .set({ galleryOrder: neighbor.galleryOrder })
        .where(eq(productImages.id, current.id));
      await tx
        .update(productImages)
        .set({ galleryOrder: current.galleryOrder })
        .where(eq(productImages.id, neighbor.id));
    });
  } catch (err) {
    logError("admin.gallery.reorder_failed", err, { imageId, direction });
    return { status: "error", message: "Couldn't reorder. Please try again." };
  }

  revalidateGallery();
  return { status: "success" };
}
