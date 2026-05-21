"use server"

import { revalidatePath } from "next/cache"
import type { PoolClient } from "pg"

import {
  approvalKanbanColumnSchema,
  updateDirectorReviewSchema,
  updatePublishingInfoSchema,
  updateSupervisorReviewSchema,
} from "@/app/admin/approvals/schema"
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { getApprovalContentReportById } from "@/lib/content-reports"
import { can, canDirectorReview } from "@/lib/permissions"
import { query, transaction } from "@/lib/db"
import { enforceRateLimit } from "@/lib/rate-limit"

import { APPROVAL_REVALIDATE_PATHS } from "@/lib/dashboard-revalidate-paths"

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
}

type ReviewGateRow = {
  id: number
  supervisor_status: "Pending" | "Approved" | "Rejected" | "Revision"
  supervisor_notes: string | null
  director_status: "Pending" | "Approved" | "Rejected" | "Revision"
  director_notes: string | null
  publish_status: "Pending" | "Scheduled" | "Published" | "Cancelled"
  scheduled_published_date: Date | null
  remarks_revision_summary: string | null
}

type ApprovalUpdateData = {
  updatedApproval: ContentReport
}

function getSupervisorReviewPermissionKey(
  supervisorStatus: "Pending" | "Approved" | "Rejected" | "Revision"
) {
  return supervisorStatus === "Revision"
    ? "approvals.request_revision"
    : "approvals.supervisor_review"
}

async function authorizeApprovalAction(permissionKey: string) {
  const context = await getCurrentProfileContext()

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
      } satisfies ActionResult,
    }
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "Your account is not active.",
      } satisfies ActionResult,
    }
  }

  const allowed = await can(context.profile.auth_user_id, permissionKey)

  if (!allowed) {
    return {
      error: {
        success: false,
        message: "You do not have permission to perform this action.",
      } satisfies ActionResult,
    }
  }

  return {
    context,
  }
}

async function getReviewGate(reportId: number) {
  const result = await query<ReviewGateRow>(
    `
    SELECT
      id,
      supervisor_status,
      supervisor_notes,
      director_status,
      director_notes,
      publish_status,
      scheduled_published_date,
      remarks_revision_summary
    FROM content_report
    WHERE id = $1
    LIMIT 1
    `,
    [reportId]
  )

  return result.rows[0]
}

function revalidateApprovalRoutes() {
  for (const route of APPROVAL_REVALIDATE_PATHS) {
    revalidatePath(route)
  }
}

function serializeStatus(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value == null ? null : String(value)
}

async function getUpdatedApprovalOrThrow(reportId: number) {
  const updatedApproval = await getApprovalContentReportById(reportId)

  if (!updatedApproval) {
    throw new Error("Content report was not found after update.")
  }

  return updatedApproval
}

async function insertApprovalActivityLog({
  client,
  reportId,
  actorProfileId,
  action,
  fromStatus,
  toStatus,
  notes,
  metadata,
}: {
  client: PoolClient
  reportId: number
  actorProfileId: number
  action: string
  fromStatus: string | null
  toStatus: string | null
  notes: string
  metadata?: Record<string, unknown>
}) {
  await client.query(
    `
    INSERT INTO approval_activity_log (
      content_report_id,
      actor_profile_id,
      action,
      from_status,
      to_status,
      notes,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      reportId,
      actorProfileId,
      action,
      fromStatus,
      toStatus,
      notes,
      metadata ? JSON.stringify(metadata) : null,
    ]
  )
}

export async function updateSupervisorReview(
  input: unknown
): Promise<ActionResult<ApprovalUpdateData>> {
  const parsed = updateSupervisorReviewSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid supervisor review.",
    }
  }

  const authorization = await authorizeApprovalAction(
    getSupervisorReviewPermissionKey(parsed.data.supervisorStatus)
  )

  if (authorization.error) {
    return authorization.error
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message }
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          remarks_revision_summary
        FROM content_report
        WHERE id = $1
        FOR UPDATE
        `,
        [parsed.data.reportId]
      )
      const current = currentResult.rows[0]

      if (!current) {
        throw new Error("Content report was not found.")
      }

      await client.query(
        `
        UPDATE content_report
        SET
          supervisor_status = $2,
          supervisor_notes = $3,
          supervisor_reviewed_by_profile_id = $4,
          supervisor_reviewed_at = now(),
          publish_status = CASE
            WHEN $2 = 'Approved' AND director_status = 'Approved'
              THEN publish_status
            ELSE 'Pending'
          END,
          scheduled_published_date = CASE
            WHEN $2 = 'Approved' AND director_status = 'Approved'
              THEN scheduled_published_date
            ELSE NULL
          END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.supervisorStatus,
          parsed.data.supervisorNotes,
          authorization.context.profile.id,
        ]
      )

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: authorization.context.profile.id,
        action: "supervisor_review_update",
        fromStatus: current.supervisor_status,
        toStatus: parsed.data.supervisorStatus,
        notes: parsed.data.supervisorNotes,
        metadata: {
          previousNotes: current.supervisor_notes,
          confirmationAccepted: parsed.data.confirmationAccepted,
          source: "approval_form",
        },
      })
    })

    revalidateApprovalRoutes()
    const updatedApproval = await getUpdatedApprovalOrThrow(parsed.data.reportId)

    return {
      success: true,
      message: "Supervisor review updated successfully.",
      data: { updatedApproval },
    }
  } catch (error) {
    console.error("updateSupervisorReview failed:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    }
  }
}

export async function updateDirectorReview(
  input: unknown
): Promise<ActionResult<ApprovalUpdateData>> {
  const context = await getCurrentProfileContext()

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    }
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    }
  }

  const parsed = updateDirectorReviewSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid director review.",
    }
  }

  const hasDirectorAccess = await canDirectorReview(
    context.profile.auth_user_id,
    context.profile.id
  )

  if (!hasDirectorAccess) {
    return {
      success: false,
      message: "You do not have permission to perform this action.",
    }
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message }
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          remarks_revision_summary
        FROM content_report
        WHERE id = $1
        FOR UPDATE
        `,
        [parsed.data.reportId]
      )
      const current = currentResult.rows[0]

      if (!current) {
        throw new Error("Content report was not found.")
      }

      await client.query(
        `
        UPDATE content_report
        SET
          director_status = $2,
          director_notes = $3,
          director_reviewed_by_profile_id = $4,
          director_reviewed_at = now(),
          publish_status = CASE
            WHEN supervisor_status = 'Approved' AND $2 = 'Approved'
              THEN publish_status
            ELSE 'Pending'
          END,
          scheduled_published_date = CASE
            WHEN supervisor_status = 'Approved' AND $2 = 'Approved'
              THEN scheduled_published_date
            ELSE NULL
          END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.directorStatus,
          parsed.data.directorNotes,
          context.profile.id,
        ]
      )

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        action: "director_review_update",
        fromStatus: current.director_status,
        toStatus: parsed.data.directorStatus,
        notes: parsed.data.directorNotes,
        metadata: {
          previousNotes: current.director_notes,
          confirmationAccepted: parsed.data.confirmationAccepted,
          source: "approval_form",
        },
      })
    })

    revalidateApprovalRoutes()
    const updatedApproval = await getUpdatedApprovalOrThrow(parsed.data.reportId)

    return {
      success: true,
      message: "Director review updated successfully.",
      data: { updatedApproval },
    }
  } catch (error) {
    console.error("updateDirectorReview failed:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    }
  }
}

export async function updatePublishingInfo(
  input: unknown
): Promise<ActionResult<ApprovalUpdateData>> {
  const authorization = await authorizeApprovalAction(
    "approvals.publish_update"
  )

  if (authorization.error) {
    return authorization.error
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message }
  }

  const parsed = updatePublishingInfoSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid publishing details.",
    }
  }

  const reviewGate = await getReviewGate(parsed.data.reportId)

  if (!reviewGate) {
    return {
      success: false,
      message: "Content report was not found.",
    }
  }

  if (
    !canEditPublishingFields({
      supervisorStatus: reviewGate.supervisor_status,
      directorStatus: reviewGate.director_status,
    })
  ) {
    return {
      success: false,
      message:
        "Publishing fields are locked until supervisor and director are approved.",
    }
  }

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          remarks_revision_summary
        FROM content_report
        WHERE id = $1
        FOR UPDATE
        `,
        [parsed.data.reportId]
      )
      const current = currentResult.rows[0]

      if (!current) {
        throw new Error("Content report was not found.")
      }

      if (!canEditPublishingFields({
        supervisorStatus: current.supervisor_status,
        directorStatus: current.director_status,
      })) {
        throw new Error(
          "Publishing fields are locked until supervisor and director are approved."
        )
      }

      await client.query(
        `
        UPDATE content_report
        SET
          publish_status = $2,
          scheduled_published_date = $3,
          remarks_revision_summary = $4,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.reportId,
          parsed.data.publishStatus,
          parsed.data.scheduledPublishedDate,
          parsed.data.remarksRevisionSummary,
        ]
      )

      await insertApprovalActivityLog({
        client,
        reportId: parsed.data.reportId,
        actorProfileId: authorization.context.profile.id,
        action: "publishing_update",
        fromStatus: current.publish_status,
        toStatus: parsed.data.publishStatus,
        notes: parsed.data.remarksRevisionSummary,
        metadata: {
          previousScheduledPublishedDate: serializeStatus(
            current.scheduled_published_date
          ),
          scheduledPublishedDate: serializeStatus(
            parsed.data.scheduledPublishedDate
          ),
          previousRemarksRevisionSummary: current.remarks_revision_summary,
          confirmationAccepted: parsed.data.confirmationAccepted,
          source: "approval_form",
        },
      })
    })

    revalidateApprovalRoutes()
    const updatedApproval = await getUpdatedApprovalOrThrow(parsed.data.reportId)

    return {
      success: true,
      message: "Publishing details updated successfully.",
      data: { updatedApproval },
    }
  } catch (error) {
    console.error("updatePublishingInfo failed:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    }
  }
}

export async function updateApprovalKanbanColumn(
  input: unknown
): Promise<ActionResult<ApprovalUpdateData>> {
  const context = await getCurrentProfileContext()

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    }
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    }
  }

  const rateLimit = await enforceRateLimit({
    bucket: "approval:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message }
  }

  const parsed = approvalKanbanColumnSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid approval workflow update.",
    }
  }

  const canSupervisorReview = await can(
    context.profile.auth_user_id,
    "approvals.supervisor_review"
  )
  const canRequestRevision = await can(
    context.profile.auth_user_id,
    "approvals.request_revision"
  )
  const canPublishUpdate = await can(
    context.profile.auth_user_id,
    "approvals.publish_update"
  )
  const hasDirectorAccess = await canDirectorReview(
    context.profile.auth_user_id,
    context.profile.id
  )

  try {
    await transaction(async (client) => {
      const currentResult = await client.query<ReviewGateRow>(
        `
        SELECT
          id,
          supervisor_status,
          supervisor_notes,
          director_status,
          director_notes,
          publish_status,
          scheduled_published_date,
          remarks_revision_summary
        FROM content_report
        WHERE id = $1
        FOR UPDATE
        `,
        [parsed.data.reportId]
      )
      const current = currentResult.rows[0]

      if (!current) {
        throw new Error("Content report was not found.")
      }

      const notes = parsed.data.notes
      const baseLog = {
        client,
        reportId: parsed.data.reportId,
        actorProfileId: context.profile.id,
        notes,
        metadata: {
          fromColumn: parsed.data.fromColumn,
          toColumn: parsed.data.toColumn,
          confirmationAccepted: parsed.data.confirmationAccepted,
          source: "kanban_drag",
        },
      }

      if (parsed.data.toColumn === "pending") {
        if (!canSupervisorReview) {
          throw new Error("You do not have permission to perform this action.")
        }

        await client.query(
          `
          UPDATE content_report
          SET
            supervisor_status = 'Pending',
            supervisor_notes = $2,
            supervisor_reviewed_by_profile_id = $3,
            supervisor_reviewed_at = now(),
            publish_status = 'Pending',
            scheduled_published_date = NULL,
            updated_at = now()
          WHERE id = $1
          `,
          [parsed.data.reportId, notes, context.profile.id]
        )
        await insertApprovalActivityLog({
          ...baseLog,
          action: "kanban_supervisor_status_update",
          fromStatus: current.supervisor_status,
          toStatus: "Pending",
        })
        return
      }

      if (parsed.data.toColumn === "supervisor-approved") {
        if (!canSupervisorReview) {
          throw new Error("You do not have permission to perform this action.")
        }

        await client.query(
          `
          UPDATE content_report
          SET
            supervisor_status = 'Approved',
            supervisor_notes = $2,
            supervisor_reviewed_by_profile_id = $3,
            supervisor_reviewed_at = now(),
            director_status = CASE
              WHEN director_status IN ('Rejected', 'Revision') THEN director_status
              ELSE 'Pending'
            END,
            publish_status = 'Pending',
            scheduled_published_date = NULL,
            updated_at = now()
          WHERE id = $1
          `,
          [parsed.data.reportId, notes, context.profile.id]
        )
        await insertApprovalActivityLog({
          ...baseLog,
          action: "kanban_supervisor_status_update",
          fromStatus: current.supervisor_status,
          toStatus: "Approved",
        })
        return
      }

      if (
        parsed.data.toColumn === "revision" ||
        parsed.data.toColumn === "rejected"
      ) {
        const nextStatus =
          parsed.data.toColumn === "revision" ? "Revision" : "Rejected"
        const shouldUpdateDirector = current.supervisor_status === "Approved"

        if (shouldUpdateDirector) {
          const canApplyDirectorDecision =
            nextStatus === "Revision" ? canRequestRevision : hasDirectorAccess

          if (!canApplyDirectorDecision) {
            throw new Error("You do not have permission to perform this action.")
          }

          await client.query(
            `
            UPDATE content_report
            SET
              director_status = $2,
              director_notes = $3,
              director_reviewed_by_profile_id = $4,
              director_reviewed_at = now(),
              publish_status = 'Pending',
              scheduled_published_date = NULL,
              updated_at = now()
            WHERE id = $1
            `,
            [parsed.data.reportId, nextStatus, notes, context.profile.id]
          )
          await insertApprovalActivityLog({
            ...baseLog,
            action: "kanban_director_status_update",
            fromStatus: current.director_status,
            toStatus: nextStatus,
          })
          return
        }

        const canApplySupervisorDecision =
          nextStatus === "Revision" ? canRequestRevision : canSupervisorReview

        if (!canApplySupervisorDecision) {
          throw new Error("You do not have permission to perform this action.")
        }

        await client.query(
          `
          UPDATE content_report
          SET
            supervisor_status = $2,
            supervisor_notes = $3,
            supervisor_reviewed_by_profile_id = $4,
            supervisor_reviewed_at = now(),
            publish_status = 'Pending',
            scheduled_published_date = NULL,
            updated_at = now()
          WHERE id = $1
          `,
          [parsed.data.reportId, nextStatus, notes, context.profile.id]
        )
        await insertApprovalActivityLog({
          ...baseLog,
          action: "kanban_supervisor_status_update",
          fromStatus: current.supervisor_status,
          toStatus: nextStatus,
        })
        return
      }

      if (parsed.data.toColumn === "approved") {
        if (!hasDirectorAccess) {
          throw new Error("You do not have permission to perform this action.")
        }

        if (current.supervisor_status !== "Approved") {
          throw new Error("Supervisor approval is required first.")
        }

        await client.query(
          `
          UPDATE content_report
          SET
            director_status = 'Approved',
            director_notes = $2,
            director_reviewed_by_profile_id = $3,
            director_reviewed_at = now(),
            publish_status = 'Pending',
            scheduled_published_date = NULL,
            updated_at = now()
          WHERE id = $1
          `,
          [parsed.data.reportId, notes, context.profile.id]
        )
        await insertApprovalActivityLog({
          ...baseLog,
          action: "kanban_director_status_update",
          fromStatus: current.director_status,
          toStatus: "Approved",
        })
        return
      }

      if (
        parsed.data.toColumn === "scheduled" ||
        parsed.data.toColumn === "published"
      ) {
        if (!canPublishUpdate) {
          throw new Error("You do not have permission to perform this action.")
        }

        if (!canEditPublishingFields({
          supervisorStatus: current.supervisor_status,
          directorStatus: current.director_status,
        })) {
          throw new Error(
            "Publishing fields are locked until supervisor and director are approved."
          )
        }

        const nextStatus =
          parsed.data.toColumn === "scheduled" ? "Scheduled" : "Published"

        await client.query(
          `
          UPDATE content_report
          SET
            publish_status = $2,
            scheduled_published_date = COALESCE(scheduled_published_date, now()),
            remarks_revision_summary = $3,
            updated_at = now()
          WHERE id = $1
          `,
          [parsed.data.reportId, nextStatus, notes]
        )
        await insertApprovalActivityLog({
          ...baseLog,
          action: "kanban_publishing_update",
          fromStatus: current.publish_status,
          toStatus: nextStatus,
        })
      }
    })

    revalidateApprovalRoutes()
    const updatedApproval = await getUpdatedApprovalOrThrow(parsed.data.reportId)

    return {
      success: true,
      message: "Approval workflow updated successfully.",
      data: { updatedApproval },
    }
  } catch (error) {
    console.error("updateApprovalKanbanColumn failed:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    }
  }
}
