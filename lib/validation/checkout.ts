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
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const cartPayloadSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20),
    })
  )
  .min(1, "Your cart is empty");

export type CartPayload = z.infer<typeof cartPayloadSchema>;
