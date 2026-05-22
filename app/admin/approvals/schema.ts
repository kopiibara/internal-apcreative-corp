import { z } from "zod";

import {
  APPROVAL_KANBAN_COLUMN_IDS,
  APPROVAL_STATUSES,
  PUBLISH_STATUSES,
} from "@/lib/approval-statuses";

const optionalDateSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? new Date(trimmed) : null;
  }

  return value ?? null;
}, z.date().nullable());

const requiredNotesSchema = z
  .string()
  .trim()
  .min(1, "Please add a note before updating this approval.");

const confirmationAcceptedSchema = z.literal(true, {
  error: "Please confirm this approval update before continuing.",
});

export const updateSupervisorReviewSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    supervisorStatus: z.enum(APPROVAL_STATUSES),
    supervisorNotes: requiredNotesSchema,
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict();

export const updateDirectorReviewSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    directorStatus: z.enum(APPROVAL_STATUSES),
    directorNotes: requiredNotesSchema,
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict();

export const updatePublishingInfoSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    publishStatus: z.enum(PUBLISH_STATUSES),
    scheduledPublishedDate: optionalDateSchema,
    remarksRevisionSummary: requiredNotesSchema,
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict();

export const approvalKanbanColumnSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    fromColumn: z.string().min(1),
    toColumn: z.enum(APPROVAL_KANBAN_COLUMN_IDS),
    notes: requiredNotesSchema,
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict();

export type ApprovalKanbanColumnInput = z.infer<
  typeof approvalKanbanColumnSchema
>;
