import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Derives a URL-safe slug from a product name, e.g. "Milo the Bear" ->
 * "milo-the-bear". Used by ProductForm to fill the slug field as the admin
 * types the name, so the storefront URL doesn't need typing out by hand —
 * the field stays editable for the rare case a different slug is wanted. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Mirrors the `products.low_stock_threshold` column default in
 * lib/db/schema.ts. Duplicated as a plain literal rather than imported from
 * the schema so client components (ProductForm) can use it without pulling
 * the Drizzle schema into the browser bundle — keep the two in sync. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(SLUG_RE, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priceDollars: z.coerce.number().positive("Price must be greater than 0").max(100000),
  category: z.enum(["amigurumi", "flowers", "home-decor", "baskets"]),
  status: z.enum(["active", "draft", "sold_out"]),
  stockQty: z.coerce.number().int().min(0).max(100000),
  /** min(0) is intentional — 0 is the "never alert me about this one" escape
   * hatch. No cross-field check against stockQty: a threshold above current
   * stock is exactly the state that should be firing the alert. */
  lowStockThreshold: z.coerce.number().int().min(0).max(100000),
  /** The three specs a shopper needs to buy a handmade piece sight-unseen.
   * All optional: the catalogue gets filled in over time, and a product page
   * renders only the ones that are set. */
  dimensions: z.string().trim().max(200).optional().or(z.literal("")),
  materials: z.string().trim().max(200).optional().or(z.literal("")),
  careInstructions: z.string().trim().max(400).optional().or(z.literal("")),
});

/** z.coerce fields give distinct input/output shapes — see DiscountForm.tsx's
 * useForm<Input, _, Output> comment for why both are exported. */
export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductFormInput = z.input<typeof productSchema>;
