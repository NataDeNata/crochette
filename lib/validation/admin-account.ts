import { z } from "zod";

/** 12 rather than the 8 the customer signup schema asks for. This is the one
 * account that can read every customer's name, email, phone and address, and
 * it belongs to a single person who sets it once — the usability cost of four
 * more characters lands on nobody but the owner. No composition rules
 * (upper/digit/symbol): they push people toward `Password1!` and NIST SP
 * 800-63B advises against them. */
export const ADMIN_PASSWORD_MIN = 12;

export const adminPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(ADMIN_PASSWORD_MIN, `Use at least ${ADMIN_PASSWORD_MIN} characters.`)
      .max(200, "That's longer than 200 characters."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "The two new passwords don't match.",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "That's the password you're already using.",
    path: ["newPassword"],
  });

/** Accepts a 6-digit TOTP code *or* a backup code, because the login form and
 * the disable-2FA form both take either. Length is the only thing checked here
 * — which of the two it is gets decided against the database. */
export const secondFactorCodeSchema = z
  .string()
  .trim()
  .min(6, "Enter the 6-digit code from your authenticator app.")
  .max(20, "That doesn't look like a code.");
