import { z } from "zod";

export const customOrderSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  pieceType: z.string().trim().min(1, "Please choose a piece type"),
  preferredSize: z.string().trim().max(120).optional().or(z.literal("")),
  preferredColors: z.string().trim().max(200).optional().or(z.literal("")),
  budgetRange: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(2000),
});

export type CustomOrderInput = z.infer<typeof customOrderSchema>;
