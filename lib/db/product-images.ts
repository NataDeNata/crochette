import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/validation/photos";
import { logError } from "@/lib/observability/log";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80);
}

/** Validates a batch of product photo files, uploads them to Blob, and
 * inserts their `product_images` rows. Shared by two callers that disagree
 * about *where* the batch lands — `createProduct` (a brand-new product, no
 * existing photos, first upload is always the cover) and
 * `uploadProductImages` (an established product that may already have up to
 * `MAX_PRODUCT_IMAGES` of its own) — which is why placement is the caller's
 * job via `startPosition`/`markFirstPrimary` rather than something this
 * function works out on its own. */
export async function uploadProductImageFiles(
  productId: string,
  files: File[],
  { startPosition = 0, markFirstPrimary = true }: { startPosition?: number; markFirstPrimary?: boolean } = {},
): Promise<{ error?: string }> {
  if (files.length === 0) return {};

  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: "Photos must be JPG, PNG, or WebP." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Each photo must be 5MB or smaller." };
    }
  }

  let uploads;
  try {
    uploads = await Promise.all(
      files.map((file) =>
        put(`products/${productId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`, file, {
          access: "public",
        }),
      ),
    );
  } catch (err) {
    logError("admin.product_image.blob_upload_failed", err, { productId });
    return { error: "Couldn't upload those photos. Please try again." };
  }

  try {
    await db.insert(productImages).values(
      uploads.map((upload, i) => ({
        productId,
        url: upload.url,
        position: startPosition + i,
        isPrimary: markFirstPrimary && i === 0,
      })),
    );
  } catch (err) {
    logError("admin.product_image.db_insert_failed", err, { productId });
    return { error: "Photos uploaded but couldn't be saved. Please try again." };
  }

  return {};
}
