import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  tag: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(["active", "draft", "sold_out"]),
  stockQty: z.coerce.number().int().min(0).max(100000),
});

export type ProductFormValues = z.infer<typeof productSchema>;
