import { z } from "zod";
import { singleLine } from "@/lib/validation/single-line";

export const contactSchema = z.object({
  name: singleLine(z.string().trim().min(1, "Please enter your name").max(120)),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  subject: singleLine(z.string().trim().max(200)).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
