// employee/daily-progress/schema.ts

import { z } from "zod";

import { richTextToPlainText } from "@/lib/rich-text/rich-text";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

export const lateReasonCategories = [
  "On Leave",
  "Blockers",
  "Late Submit",
  "Others",
] as const;

export const submitDailyProgressSchema = z
  .object({
    reportDate: dateKeySchema,

    /**
     * Multi-brand support for a single submission:
     * - [] means "No brand"
     * - [1, 2, 3] means one report submission connected to multiple brands
     */
    brandIds: z
      .array(z.coerce.number().int().positive())
      .max(20, "You can only select up to 20 brands.")
      .default([])
      .transform((brandIds) => Array.from(new Set(brandIds))),

    summary: z
      .string()
      .refine((value) => richTextToPlainText(value).length > 0, {
        message: "Summary is required.",
      })
      .refine((value) => richTextToPlainText(value).length <= 4000, {
        message: "Summary must be 4,000 characters or less.",
      }),

    blockers: z
      .string()
      .refine((value) => richTextToPlainText(value).length <= 4000, {
        message: "Blockers must be 4,000 characters or less.",
      })
      .optional()
      .nullable(),

    proofLink: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .refine(
        (value) => !value || /^https?:\/\/\S+$/i.test(value),
        "Proof link must be a valid http(s) URL.",
      ),

    lateReasonCategory: z.enum(lateReasonCategories).optional().nullable(),

    lateReason: z.string().trim().max(2000).optional().nullable(),
  })
  .refine(
    (value) =>
      value.lateReasonCategory !== "Others" ||
      Boolean(value.lateReason?.trim()),
    {
      path: ["lateReason"],
      message: "Reason details are required when Others is selected.",
    },
  );
