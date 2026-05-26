import { z } from "zod";

import {
  APPROVAL_REVISION_AREA_IDS,
  canIncludeBrandRevisionArea,
} from "@/lib/approvals/approval-revision";
import {
  APPROVAL_KANBAN_COLUMN_IDS,
  APPROVAL_STATUSES,
  PUBLISH_STATUSES,
} from "@/lib/approvals/approval-statuses";

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

const revisionAreasSchema = z
  .array(z.enum(APPROVAL_REVISION_AREA_IDS))
  .min(1, "Select at least one area that needs revision.");

const revisionInstructionSchema = z
  .string()
  .trim()
  .min(1, "Add a clear revision instruction for the creator.");

const optionalRevisionAreasSchema = z.preprocess((value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return value;
}, revisionAreasSchema.optional());

const optionalRevisionInstructionSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}, revisionInstructionSchema.optional());

const optionalNotesSchema = z.string().trim().optional();

const revisionRequestFieldsSchema = z.object({
  revisionAreas: revisionAreasSchema,
  revisionInstruction: revisionInstructionSchema,
  otherExplanation: z.string().trim().optional(),
});

function validateRevisionRequest(
  data: {
    status: string;
    supervisorStatus?: string;
    directorStatus?: string;
    revisionAreas?: string[];
    revisionInstruction?: string;
    otherExplanation?: string;
    notes?: string;
  },
  ctx: z.RefinementCtx,
  statusKey: "supervisorStatus" | "directorStatus",
  notesKey: "supervisorNotes" | "directorNotes",
) {
  const status = data[statusKey];

  if (status !== "Revision") {
    if (!data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [notesKey],
        message: "Please add a note before updating this approval.",
      });
    }
    return;
  }

  const parsedRevision = revisionRequestFieldsSchema.safeParse({
    revisionAreas: data.revisionAreas,
    revisionInstruction: data.revisionInstruction,
    otherExplanation: data.otherExplanation,
  });

  if (!parsedRevision.success) {
    for (const issue of parsedRevision.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: issue.path,
        message: issue.message,
      });
    }
    return;
  }

  if (parsedRevision.data.revisionAreas.includes("other")) {
    if (!parsedRevision.data.otherExplanation?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherExplanation"],
        message: "Add a short explanation when Other is selected.",
      });
    }
  }

  const reportStatuses = {
    supervisorStatus:
      statusKey === "supervisorStatus" ? "Revision" : data.supervisorStatus ?? "Pending",
    directorStatus:
      statusKey === "directorStatus" ? "Revision" : data.directorStatus ?? "Pending",
  };

  if (
    parsedRevision.data.revisionAreas.includes("brand") &&
    !canIncludeBrandRevisionArea(reportStatuses)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revisionAreas"],
      message: "Brand can only be revised before any review action.",
    });
  }
}

export const updateSupervisorReviewSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    supervisorStatus: z.enum(APPROVAL_STATUSES),
    supervisorNotes: optionalNotesSchema,
    revisionAreas: optionalRevisionAreasSchema,
    revisionInstruction: optionalRevisionInstructionSchema,
    otherExplanation: z.string().trim().optional(),
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    validateRevisionRequest(
      {
        status: data.supervisorStatus,
        supervisorStatus: data.supervisorStatus,
        revisionAreas: data.revisionAreas,
        revisionInstruction: data.revisionInstruction,
        otherExplanation: data.otherExplanation,
        notes: data.supervisorNotes,
      },
      ctx,
      "supervisorStatus",
      "supervisorNotes",
    );
  });

export const updateDirectorReviewSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    directorStatus: z.enum(APPROVAL_STATUSES),
    directorNotes: optionalNotesSchema,
    revisionAreas: optionalRevisionAreasSchema,
    revisionInstruction: optionalRevisionInstructionSchema,
    otherExplanation: z.string().trim().optional(),
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    validateRevisionRequest(
      {
        status: data.directorStatus,
        directorStatus: data.directorStatus,
        revisionAreas: data.revisionAreas,
        revisionInstruction: data.revisionInstruction,
        otherExplanation: data.otherExplanation,
        notes: data.directorNotes,
      },
      ctx,
      "directorStatus",
      "directorNotes",
    );
  });

export const updatePublishingInfoSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    publishStatus: z.enum(PUBLISH_STATUSES),
    scheduledPublishedDate: optionalDateSchema,
    remarksRevisionSummary: requiredNotesSchema,
    proofUrl: z.preprocess((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed.length > 0 ? trimmed : null;
      }

      return value ?? null;
    }, z.string().url("Publishing proof must be a valid URL.").nullable()),
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .refine(
    (data) => data.publishStatus !== "Published" || Boolean(data.proofUrl),
    {
      path: ["proofUrl"],
      message: "Publishing proof is required before marking as Published.",
    },
  )
  .strict();

export const approvalKanbanColumnSchema = z
  .object({
    reportId: z.coerce.number().int().positive(),
    fromColumn: z.string().min(1),
    toColumn: z.enum(APPROVAL_KANBAN_COLUMN_IDS),
    notes: optionalNotesSchema,
    revisionAreas: optionalRevisionAreasSchema,
    revisionInstruction: optionalRevisionInstructionSchema,
    otherExplanation: z.string().trim().optional(),
    confirmationAccepted: confirmationAcceptedSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.toColumn !== "revision") {
      if (!data.notes?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["notes"],
          message: "Please add a note before updating this approval.",
        });
      }
      return;
    }

    const parsedRevision = revisionRequestFieldsSchema.safeParse({
      revisionAreas: data.revisionAreas,
      revisionInstruction: data.revisionInstruction,
      otherExplanation: data.otherExplanation,
    });

    if (!parsedRevision.success) {
      for (const issue of parsedRevision.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: issue.path,
          message: issue.message,
        });
      }
      return;
    }

    if (parsedRevision.data.revisionAreas.includes("other")) {
      if (!parsedRevision.data.otherExplanation?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherExplanation"],
          message: "Add a short explanation when Other is selected.",
        });
      }
    }
  });

export type ApprovalKanbanColumnInput = z.infer<
  typeof approvalKanbanColumnSchema
>;
