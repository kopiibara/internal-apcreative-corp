import { z } from "zod";

import {
  publishStatuses,
  reviewStatuses,
} from "@/app/employee/approvals/schema";

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}, z.string().nullable());

const optionalDateSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? new Date(trimmed) : null;
  }

  return value ?? null;
}, z.date().nullable());

export const updateSupervisorReviewSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  supervisorStatus: z.enum(reviewStatuses),
  supervisorNotes: optionalTextSchema,
});

export const updateDirectorReviewSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  directorStatus: z.enum(reviewStatuses),
  directorNotes: optionalTextSchema,
});

export const updatePublishingInfoSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  publishStatus: z.enum(publishStatuses),
  scheduledPublishedDate: optionalDateSchema,
  remarksRevisionSummary: optionalTextSchema,
});
