import { z } from "zod";

/** Shared by the admin create/edit form (client-side RHF resolver) and the
 * Server Action (authoritative re-validation) — see app/admin/discounts. */
export const discountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Code must be at least 2 characters")
      .max(40, "Code must be 40 characters or fewer")
      .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers, and hyphens only")
      .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    type: z.enum(["percentage", "fixed"]),
    /** Display unit, not storage unit — a whole percent for "percentage",
     * or a currency amount (e.g. 50.50) for "fixed". The Server Action
     * converts "fixed" to cents, mirroring priceDollars -> priceCents in
     * lib/validation/product.ts. */
    value: z.coerce.number().positive("Value must be greater than 0").max(1000000),
    active: z.coerce.boolean(),
    maxUses: z.coerce.number().int().positive().max(1000000).optional().or(z.literal("")),
    minSubtotalDollars: z.coerce.number().min(0).max(1000000).optional().or(z.literal("")),
    expiresAt: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.type !== "percentage" || (Number.isInteger(data.value) && data.value <= 100), {
    message: "A percentage discount must be a whole number from 1 to 100",
    path: ["value"],
  });

/** z.coerce fields give `discountSchema` distinct input/output shapes —
 * RHF needs both: raw input types for defaultValues, output types for the
 * validated submit handler. See DiscountForm.tsx's useForm<Input, _, Output>. */
export type DiscountFormValues = z.infer<typeof discountSchema>;
export type DiscountFormInput = z.input<typeof discountSchema>;
