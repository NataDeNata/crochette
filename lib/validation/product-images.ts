import { z } from "zod";

/** Total images allowed per product — independent of MAX_PHOTOS in
 * lib/validation/photos.ts, which governs custom-order reference photos. */
export const MAX_PRODUCT_IMAGES = 8;

export const productImageMetaSchema = z.object({
  caption: z.string().trim().max(200).optional().or(z.literal("")),
  alt: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ProductImageMetaValues = z.infer<typeof productImageMetaSchema>;
