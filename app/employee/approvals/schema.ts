import { z } from "zod";

import {
  APPROVAL_STATUSES,
  PUBLISH_STATUSES,
  type ApprovalStatus,
  type PublishStatus as ApprovalPublishStatus,
} from "@/lib/approvals/approval-statuses";
import { validateProofUrl } from "@/lib/proof/proof-media";
import {
  addProofSubmissionRefinement,
  proofTypeFieldSchema,
  proofUrlFieldSchema,
} from "@/lib/proof/proof-schema";
import { richTextToPlainText } from "@/lib/rich-text/rich-text";

export const contentTypes = [
  "Graphic",
  "Photo",
  "Video",
  "Reel",
  "Carousel",
  "Story",
  "Blog",
  "Ad Creative",
  "Event Poster",
  "Promo Announcement",
  "Testimonial",
  "Menu/Product Feature",
] as const;

export const reviewStatuses = APPROVAL_STATUSES;
export const publishStatuses = PUBLISH_STATUSES;

export const platformOptions = [
  "Meta (IG and FB)",
  "TikTok",
  "YouTube",
  "All Platforms",
] as const;

export type ContentType = (typeof contentTypes)[number];
export type ReviewStatus = ApprovalStatus;
export type PublishStatus = ApprovalPublishStatus;
export type Platform = (typeof platformOptions)[number];

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}, z.string().nullable());

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}, z.string().url("Asset link must be a valid URL.").nullable());

export const createContentReportSchema = z.object({
  brandId: z.coerce.number().int().positive().optional(),
  contentType: z.enum(contentTypes),
  platform: z.enum(platformOptions).default("Meta (IG and FB)"),
  contentInspo: optionalTextSchema,
  caption: z.string().trim().min(1, "Caption is required."),
  assetLink: optionalUrlSchema,
  employeeComments: optionalTextSchema.refine(
    (value) => !value || richTextToPlainText(value).length <= 2000,
    "Employee notes must be 2,000 characters or less.",
  ),
});

export const updateContentReportSchema = createContentReportSchema.extend({
  reportId: z.coerce.number().int().positive(),
});

export const deleteContentReportSchema = z.object({
  reportId: z.coerce.number().int().positive(),
});

const optionalPublishingNoteSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}, z.string().max(2000, "Publishing notes must be 2,000 characters or less.").nullable());

export const publishContentReportSchema = addProofSubmissionRefinement(
  z
    .object({
      reportId: z.coerce.number().int().positive(),
      proofType: proofTypeFieldSchema,
      proofUrl: proofUrlFieldSchema,
      proofNote: optionalPublishingNoteSchema,
    })
    .strict(),
);

export const scheduleContentReportSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    scheduledPublishedDate: z.preprocess((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed.length > 0 ? new Date(trimmed) : null;
      }

      return value ?? null;
    }, z.date("Scheduled publish date is required.")),
    notes: optionalPublishingNoteSchema,
    proofType: proofTypeFieldSchema.optional().default("LINK"),
    proofUrl: proofUrlFieldSchema.optional().default(""),
    proofNote: optionalPublishingNoteSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const proofUrl = value.proofUrl.trim();
    const proofNote = value.proofNote?.trim() ?? "";

    if (!proofUrl && !proofNote) {
      return;
    }

    if (value.proofType === "NOTE") {
      if (!proofNote) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add proof notes before submitting.",
          path: ["proofNote"],
        });
      }

      return;
    }

    const proofUrlError = validateProofUrl(value.proofType, proofUrl);

    if (proofUrlError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: proofUrlError,
        path: ["proofUrl"],
      });
    }
  });

export type CreateContentReportInput = z.infer<
  typeof createContentReportSchema
>;
export type UpdateContentReportInput = z.infer<
  typeof updateContentReportSchema
>;
