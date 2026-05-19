import { z } from "zod"

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
] as const

export const reviewStatuses = [
  "Pending",
  "Approved",
  "Rejected",
  "Revision",
] as const

export const publishStatuses = [
  "Pending",
  "Scheduled",
  "Published",
  "Cancelled",
] as const

export const platformOptions = [
  "Meta (Instagram and Facebook)",
  "TikTok",
  "YouTube",
  "All Platforms",
] as const

export type ContentType = (typeof contentTypes)[number]
export type ReviewStatus = (typeof reviewStatuses)[number]
export type PublishStatus = (typeof publishStatuses)[number]
export type Platform = (typeof platformOptions)[number]

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim()

    return trimmed.length > 0 ? trimmed : null
  }

  return value ?? null
}, z.string().nullable())

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim()

    return trimmed.length > 0 ? trimmed : null
  }

  return value ?? null
}, z.string().url("Asset link must be a valid URL.").nullable())

export const createContentReportSchema = z.object({
  contentType: z.enum(contentTypes),
  platform: z.enum(platformOptions).default("Meta (Instagram and Facebook)"),
  contentInspo: optionalTextSchema,
  caption: z.string().trim().min(1, "Caption is required."),
  assetLink: optionalUrlSchema,
  employeeComments: optionalTextSchema.refine(
    (value) => !value || value.length <= 2000,
    "Employee notes must be 2,000 characters or less."
  ),
})

export const updateContentReportSchema = createContentReportSchema.extend({
  reportId: z.coerce.number().int().positive(),
})

export const deleteContentReportSchema = z.object({
  reportId: z.coerce.number().int().positive(),
})

export type CreateContentReportInput = z.infer<
  typeof createContentReportSchema
>
export type UpdateContentReportInput = z.infer<
  typeof updateContentReportSchema
>
