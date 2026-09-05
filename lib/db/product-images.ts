import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { MAX_PHOTO_BYTES } from "@/lib/validation/photos";
import { sniffPhotoType } from "@/lib/validation/photo-sniff";
import { logError } from "@/lib/observability/log";

function sanitizeFilename(name: string) {
  const dotIndex = name.lastIndexOf(".");
  const withoutExtension = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  return withoutExtension.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80);
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

  let uploads;
  try {
    uploads = await Promise.all(
      sniffed.map(({ file, contentType, extension }) =>
        put(`products/${productId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}.${extension}`, file, {
          access: "public",
          contentType,
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
