"use server";

import { eq, asc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { productImageMetaSchema, MAX_PRODUCT_IMAGES } from "@/lib/validation/product-images";
import { MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/validation/photos";
import type { FormActionState } from "@/lib/actions/types";
import { logError } from "@/lib/observability/log";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80);
}

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

  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { status: "error", message: "Photos must be JPG, PNG, or WebP." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { status: "error", message: "Each photo must be 5MB or smaller." };
    }
  }

  let uploads;
  try {
    uploads = await Promise.all(
      files.map((file) =>
        put(`products/${productId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`, file, {
          access: "public",
        })
      )
    );
  } catch (err) {
    logError("admin.product_image.blob_upload_failed", err, { productId });
    return { status: "error", message: "Couldn't upload those photos — please try again." };
  }

  const hasAnyExisting = existing.length > 0;
  const startPosition = existing.reduce((max, row) => Math.max(max, row.position), -1) + 1;

  try {
    await db.insert(productImages).values(
      uploads.map((upload, i) => ({
        productId,
        url: upload.url,
        position: startPosition + i,
        isPrimary: !hasAnyExisting && i === 0,
      }))
    );
  } catch (err) {
    logError("admin.product_image.db_insert_failed", err, { productId });
    return { status: "error", message: "Photos uploaded but couldn't be saved — please try again." };
  }

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
    return { status: "error", message: "Couldn't delete that photo — please try again." };
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
    return { status: "error", message: "Couldn't reorder that photo — please try again." };
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
    return { status: "error", message: "Couldn't update the cover photo — please try again." };
  }

  const slug = await getProductSlug(row.productId);
  if (slug) revalidateStorefront(slug);
  revalidatePath(`/admin/products/${row.productId}/images`);

  return { status: "success", message: "Cover photo updated." };
}

export async function updateProductImageMeta(
  imageId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = productImageMetaSchema.safeParse({
    caption: formData.get("caption") || undefined,
    alt: formData.get("alt") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [row] = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId));
  if (!row) {
    return { status: "error", message: "That photo no longer exists." };
  }

  try {
    await db
      .update(productImages)
      .set({ caption: parsed.data.caption || null, alt: parsed.data.alt || null })
      .where(eq(productImages.id, imageId));
  } catch (err) {
    logError("admin.product_image.meta_update_failed", err, { imageId });
    return { status: "error", message: "Couldn't save changes — please try again." };
  }

  const slug = await getProductSlug(row.productId);
  if (slug) revalidateStorefront(slug);
  revalidatePath(`/admin/products/${row.productId}/images`);

  return { status: "success", message: "Saved." };
}
