import { z } from "zod";

import {
  APPROVAL_STATUSES,
  PUBLISH_STATUSES,
  type ApprovalStatus,
  type PublishStatus as ApprovalPublishStatus,
} from "@/lib/approvals/approval-statuses";

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
  "Meta (Instagram and Facebook)",
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
  platform: z.enum(platformOptions).default("Meta (Instagram and Facebook)"),
  contentInspo: optionalTextSchema,
  caption: z.string().trim().min(1, "Caption is required."),
  assetLink: optionalUrlSchema,
  employeeComments: optionalTextSchema.refine(
    (value) => !value || value.length <= 2000,
    "Employee notes must be 2,000 characters or less.",
  ),
});

export const updateContentReportSchema = createContentReportSchema.extend({
  reportId: z.coerce.number().int().positive(),
});

export const deleteContentReportSchema = z.object({
  reportId: z.coerce.number().int().positive(),
});

const requiredPublishingProofUrlSchema = z
  .string()
  .trim()
  .url("Publishing proof must be a valid URL.");

const optionalPublishingNoteSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}, z.string().max(2000, "Publishing notes must be 2,000 characters or less.").nullable());

export const publishContentReportSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    proofUrl: requiredPublishingProofUrlSchema,
    proofNote: optionalPublishingNoteSchema,
  })
  .strict();

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
    proofUrl: z.preprocess((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed.length > 0 ? trimmed : null;
      }

      return value ?? null;
    }, z.string().url("Publishing proof must be a valid URL.").nullable()),
  })
  .strict();

export type CreateContentReportInput = z.infer<
  typeof createContentReportSchema
>;
export type UpdateContentReportInput = z.infer<
  typeof updateContentReportSchema
>;
