import { z } from "zod"

import { TASK_PRIORITIES, TASK_PROOF_TYPES } from "@/lib/task-type"
import { TASK_STATUSES } from "@/lib/task-statuses"

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))

const proofText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.string().trim().max(maxLength)
  )

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    description: optionalText,
    assignedToProfileIds: z
      .array(z.coerce.number().int().positive())
      .min(1, "Select at least one assignee."),
    dueDate: z.string().nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).nullable().optional(),
  })
  .superRefine((value, context) => {
    const uniqueAssignees = [...new Set(value.assignedToProfileIds)]

    if (uniqueAssignees.length !== value.assignedToProfileIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate assignees are not allowed.",
        path: ["assignedToProfileIds"],
      })
    }
  })

export const updateTaskSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200).optional(),
  description: optionalText,
  dueDate: z.string().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).nullable().optional(),
})

export const deleteTaskSchema = z.object({
  taskId: z.coerce.number().int().positive(),
})

export const submitTaskProofSchema = z
  .object({
    assignmentId: z.coerce.number().int().positive(),
    proofType: z.enum(TASK_PROOF_TYPES),
    proofUrl: proofText(2000),
    proofNote: proofText(5000),
  })
  .superRefine((value, context) => {
    if (value.proofType === "LINK") {
      if (!value.proofUrl) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add a valid proof link.",
          path: ["proofUrl"],
        })
        return
      }

      try {
        new URL(value.proofUrl)
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add a valid proof link.",
          path: ["proofUrl"],
        })
      }
      return
    }

    if (value.proofType === "NOTE" && !value.proofNote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please add proof notes before submitting.",
        path: ["proofNote"],
      })
      return
    }

    if (value.proofType === "IMAGE" || value.proofType === "VIDEO") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File upload is not available yet. Please use a link or note.",
        path: ["proofUrl"],
      })
    }
  })

const requiredTaskNote = z
  .string()
  .trim()
  .min(1, "Please add a note before updating this task.")
  .max(5000)

const confirmationAcceptedSchema = z.literal(true, {
  error: "Verification failed. Please try again.",
})

export const reportTaskBlockerSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  blockerNote: z
    .string()
    .trim()
    .min(1, "Please add blocker notes before reporting.")
    .max(5000),
})

export const confirmTaskBlockerSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  resolutionNote: requiredTaskNote,
  dueDate: z.string().nullable().optional(),
  nextStatus: z.enum(["BLOCKER", "ASSIGNED", "PENDING"]).default("BLOCKER"),
  confirmationAccepted: confirmationAcceptedSchema,
})

export const changeTaskAssignmentStatusSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  fromStatus: z.enum(TASK_STATUSES),
  toStatus: z.enum(TASK_STATUSES),
  notes: requiredTaskNote,
  confirmationAccepted: confirmationAcceptedSchema,
})

export const confirmTaskDoneSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
})

export const requestTaskRevisionSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  revisionNote: z.string().trim().min(1, "Revision note is required.").max(2000),
})

export const deleteAssignmentSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
