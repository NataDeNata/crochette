import { z } from "zod";
import { singleLine } from "@/lib/validation/single-line";

export const signupSchema = z
  .object({
    name: singleLine(z.string().trim().min(1, "Please enter your name").max(120)),
    email: z.string().trim().email("Please enter a valid email address").max(200),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(200),
  password: z.string().min(1, "Please enter your password").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const addressSchema = z.object({
  label: z.string().trim().max(60).optional().or(z.literal("")),
  line1: z.string().trim().min(1, "Please enter your street address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Please enter your city").max(120),
  province: z.string().trim().min(1, "Please enter your province").max(120),
  postalCode: z.string().trim().min(1, "Please enter your postal code").max(20),
  isDefault: z.coerce.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
