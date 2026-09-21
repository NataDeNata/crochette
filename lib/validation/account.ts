import { z } from "zod";
import { singleLine } from "@/lib/validation/single-line";

/** One definition of "an email address we will accept", so the signup form and
 * the reset-request form cannot drift into disagreeing about it. */
const emailField = z.string().trim().email("Please enter a valid email address").max(200);

/** Likewise for a new password. The 8-character floor and the 200 ceiling are
 * the signup rules; a reset must not be an easier way to a weaker password than
 * signup allows, which is exactly what happens when the two are written out
 * separately and only one of them is ever tightened. */
const newPasswordField = z.string().min(8, "Password must be at least 8 characters").max(200);

export const signupSchema = z
  .object({
    name: singleLine(z.string().trim().min(1, "Please enter your name").max(120)),
    email: emailField,
    password: newPasswordField,
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

/** The reset request. Validated even though the action answers identically
 * whatever it is given — a typo'd address should be caught at the form rather
 * than silently accepted into a "check your inbox" screen for an inbox that
 * cannot exist. Shape only; it still says nothing about whether an account
 * holds that address. */
export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Completing a reset. No current-password field: the link *is* the proof, and
 * asking for a password from someone who is here because they do not have one
 * would make the flow useless. */
export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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
