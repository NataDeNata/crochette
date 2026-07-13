import { z } from "zod";

export const customOrderUpdateSchema = z.object({
  status: z.enum(["new", "quoted", "accepted", "in_production", "shipped", "completed", "declined"]),
  quotedPriceDollars: z.coerce.number().min(0).max(100000).optional().or(z.literal("")),
  adminNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});
