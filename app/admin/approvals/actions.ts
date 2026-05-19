"use server"

import { revalidatePath } from "next/cache"

import {
  updateDirectorReviewSchema,
  updatePublishingInfoSchema,
  updateSupervisorReviewSchema,
} from "@/app/admin/approvals/schema"
import { canEditPublishingFields } from "@/types/content-report"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { can } from "@/lib/permissions"
import { query } from "@/lib/db"
import { enforceRateLimit } from "@/lib/rate-limit"

const ADMIN_APPROVALS_PATH = "/admin/approvals"
const EMPLOYEE_CONTENT_REPORT_PATH = "/employee/content-report"

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
}

type ReviewGateRow = {
  supervisor_status: "Pending" | "Approved" | "Rejected" | "Revision"
  director_status: "Pending" | "Approved" | "Rejected" | "Revision"
}

type RolePermissionRow = {
  has_permission: boolean
}

async function hasRolePermission(profileId: number, permissionKey: string) {
  const result = await query<RolePermissionRow>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba
      JOIN role_permission rp ON rp.role_id = uba.role_id
      JOIN permission p ON p.id = rp.permission_id
      WHERE uba.profile_id = $1
        AND uba.is_active = true
        AND p.key = $2
    ) AS has_permission
    `,
    [profileId, permissionKey]
  )

  return Boolean(result.rows[0]?.has_permission)
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
    SELECT supervisor_status, director_status
    FROM content_report
    WHERE id = $1
    LIMIT 1
    `,
    [reportId]
  )

  return result.rows[0]
}

function revalidateApprovalRoutes() {
  revalidatePath(ADMIN_APPROVALS_PATH)
  revalidatePath(EMPLOYEE_CONTENT_REPORT_PATH)
}

export async function updateSupervisorReview(
  input: unknown
): Promise<ActionResult> {
  const authorization = await authorizeApprovalAction(
    "approvals.supervisor_review"
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

  const parsed = updateSupervisorReviewSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid supervisor review.",
    }
  }

  try {
    await query(
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

    revalidateApprovalRoutes()

    return {
      success: true,
      message: "Supervisor review updated successfully.",
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
): Promise<ActionResult> {
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

  const hasDirectorAccess =
    context.profile.account_type === "EXECUTIVE" ||
    context.profile.account_type === "MANAGER" ||
    (await hasRolePermission(context.profile.id, "approvals.director_review"))

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

  const parsed = updateDirectorReviewSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid director review.",
    }
  }

  try {
    await query(
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

    revalidateApprovalRoutes()

    return {
      success: true,
      message: "Director review updated successfully.",
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
): Promise<ActionResult> {
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
    await query(
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

    revalidateApprovalRoutes()

    return {
      success: true,
      message: "Publishing details updated successfully.",
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
