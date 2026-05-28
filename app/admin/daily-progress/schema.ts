import { z } from "zod";

export const reviewLateDailyProgressSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  decision: z.enum(["Approved", "Rejected"]),
  pointsAwarded: z.coerce.number().int().min(0).max(10).optional(),
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
});

export const markMissedDailyProgressSchema = z.object({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
    .optional(),
});
