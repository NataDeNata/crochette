import { z } from "zod";

export const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  shippingLine1: z.string().trim().min(1, "Please enter your street address").max(200),
  shippingLine2: z.string().trim().max(200).optional().or(z.literal("")),
  shippingCity: z.string().trim().min(1, "Please enter your city").max(120),
  shippingProvince: z.string().trim().min(1, "Please enter your province").max(120),
  shippingPostalCode: z.string().trim().min(1, "Please enter your postal code").max(20),
  discountCode: z.string().trim().max(40).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Every field name the checkout form posts, derived from the schema so the
 * two cannot drift. Used to echo a rejected submission back to the form —
 * React 19 resets an uncontrolled form once its action returns, so without the
 * echo a shopper retypes their whole address to fix one field. See
 * `FormActionState.values`. */
export const CHECKOUT_FIELDS = Object.keys(checkoutSchema.shape) as (keyof CheckoutInput)[];

// cartPayloadSchema was removed when the cart moved into the database: the
// checkout form no longer submits its contents, so there is no client payload
// left to validate. submitCheckout reads the cart from Postgres instead.
