"use server";

import { eq, asc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { productImageMetaSchema, MAX_PRODUCT_IMAGES } from "@/lib/validation/product-images";
import { uploadProductImageFiles } from "@/lib/db/product-images";
import type { FormActionState } from "@/lib/actions/types";
import { logError } from "@/lib/observability/log";

function revalidateStorefront(slug: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${slug}`);
}

async function getProductSlug(productId: string): Promise<string | undefined> {
  const [row] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, productId));
  return row?.slug;
}

export async function uploadProductImages(
  productId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { status: "error", message: "Choose at least one photo to upload." };
  }

  const existing = await db
    .select({ id: productImages.id, position: productImages.position, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  if (existing.length + files.length > MAX_PRODUCT_IMAGES) {
    return {
      status: "error",
      message: `A product can have up to ${MAX_PRODUCT_IMAGES} photos (${existing.length} already uploaded).`,
    };
  }

  const hasAnyExisting = existing.length > 0;
  const startPosition = existing.reduce((max, row) => Math.max(max, row.position), -1) + 1;

  const result = await uploadProductImageFiles(productId, files, {
    startPosition,
    markFirstPrimary: !hasAnyExisting,
  });
  if (result.error) return { status: "error", message: result.error };

  const slug = await getProductSlug(productId);
  if (slug) revalidateStorefront(slug);
  revalidatePath(`/admin/products/${productId}/images`);

  return { status: "success", message: "Photos uploaded." };
}

export async function deleteProductImage(
  imageId: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const [row] = await db
    .select({ productId: productImages.productId, url: productImages.url, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(eq(productImages.id, imageId));

  if (!row) {
    return { status: "error", message: "That photo no longer exists." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(productImages).where(eq(productImages.id, imageId));

      if (row.isPrimary) {
        const [next] = await tx
          .select({ id: productImages.id })
          .from(productImages)
          .where(eq(productImages.productId, row.productId))
          .orderBy(asc(productImages.position))
          .limit(1);
        if (next) {
          await tx.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, next.id));
        }
      }
    });
  } catch (err) {
    logError("admin.product_image.db_delete_failed", err, { imageId });
    return { status: "error", message: "Couldn't delete that photo. Please try again." };
  }

  try {
    await del(row.url);
  } catch (err) {
    // DB is the source of truth for what renders — a stray orphaned blob is
    // just wasted storage, never a user-facing failure.
    logError("admin.product_image.blob_cleanup_failed", err, { imageId });
  }

  const slug = await getProductSlug(row.productId);
  if (slug) revalidateStorefront(slug);
  revalidatePath(`/admin/products/${row.productId}/images`);

  return { status: "success", message: "Photo deleted." };
}

export async function reorderProductImage(
  imageId: string,
  direction: "up" | "down",
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const [row] = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId));
  if (!row) {
    return { status: "error", message: "That photo no longer exists." };
  }

  const siblings = await db
    .select({ id: productImages.id, position: productImages.position })
    .from(productImages)
    .where(eq(productImages.productId, row.productId))
    .orderBy(asc(productImages.position));

  const index = siblings.findIndex((s) => s.id === imageId);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= siblings.length) {
    return { status: "success" };
  }

  const current = siblings[index];
  const neighbor = siblings[neighborIndex];

  try {
    await db.transaction(async (tx) => {
      await tx.update(productImages).set({ position: neighbor.position }).where(eq(productImages.id, current.id));
      await tx.update(productImages).set({ position: current.position }).where(eq(productImages.id, neighbor.id));
    });
  } catch (err) {
    logError("admin.product_image.reorder_failed", err, { imageId, direction });
    return { status: "error", message: "Couldn't reorder that photo. Please try again." };
  }

  revalidatePath(`/admin/products/${row.productId}/images`);
  const slug = await getProductSlug(row.productId);
  if (slug) revalidatePath(`/shop/${slug}`);

  return { status: "success" };
}

export async function setPrimaryProductImage(
  imageId: string,
  _prevState: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const [row] = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId));
  if (!row) {
    return { status: "error", message: "That photo no longer exists." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(productImages)
        .set({ isPrimary: false })
        .where(and(eq(productImages.productId, row.productId), sql`${productImages.id} != ${imageId}`));
      await tx.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, imageId));
    });
  } catch (err) {
    logError("admin.product_image.set_primary_failed", err, { imageId });
    return { status: "error", message: "Couldn't update the cover photo. Please try again." };
  }

  const slug = await getProductSlug(row.productId);
  if (slug) revalidateStorefront(slug);
  revalidatePath(`/admin/products/${row.productId}/images`);

  return { status: "success", message: "Cover photo updated." };
}

/** Every photo's caption/alt on one page, saved with one button rather than
 * one "Save" per row — the page-level form (ProductImagesMetaForm) submits
 * every row's fields at once, named `caption-${id}`/`alt-${id}`, plus a
 * repeated `imageId` field listing which rows are present. Reorder, cover
 * and delete stay separate, instant, per-row actions below: those change
 * structure immediately on click, the same as every other admin list in
 * this app, and bundling them into a "changes pending" save would make a
 * reorder feel unsaved until a second, unrelated click. */
export async function updateProductImagesMeta(
  productId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const ids = formData.getAll("imageId").map(String);
  if (ids.length === 0) return { status: "success" };

  const updates: { id: string; caption: string | null; alt: string | null }[] = [];
  for (const id of ids) {
    const parsed = productImageMetaSchema.safeParse({
      caption: formData.get(`caption-${id}`) || undefined,
      alt: formData.get(`alt-${id}`) || undefined,
    });
    if (!parsed.success) {
      return { status: "error", message: "One of the captions or alt texts is too long. Please shorten it and try again." };
    }
    updates.push({ id, caption: parsed.data.caption || null, alt: parsed.data.alt || null });
  }

  try {
    await db.transaction(async (tx) => {
      for (const u of updates) {
        await tx.update(productImages).set({ caption: u.caption, alt: u.alt }).where(eq(productImages.id, u.id));
      }
    });
  } catch (err) {
    logError("admin.product_image.meta_bulk_update_failed", err, { productId });
    return { status: "error", message: "Couldn't save changes. Please try again." };
  }

  const slug = await getProductSlug(productId);
  if (slug) revalidateStorefront(slug);
  revalidatePath(`/admin/products/${productId}/images`);

  return { status: "success", message: "Photo details saved." };
}
