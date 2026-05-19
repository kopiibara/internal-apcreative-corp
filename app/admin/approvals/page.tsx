import { ApprovalDataTable } from "@/components/admin/approvals/approval-data-table"
import { getApprovalContentReports } from "@/lib/content-reports"
import { can, requirePermission } from "@/lib/permissions"
import { query } from "@/lib/db"

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

export default async function ApprovalsPage() {
  const context = await requirePermission("approvals.view")
  const [reports, canSupervisorReview, canPublishUpdate, hasDirectorRole] =
    await Promise.all([
      getApprovalContentReports(),
      can(context.profile.auth_user_id, "approvals.supervisor_review"),
      can(context.profile.auth_user_id, "approvals.publish_update"),
      hasRolePermission(context.profile.id, "approvals.director_review"),
    ])
  const canDirectorReview =
    context.profile.account_type === "EXECUTIVE" ||
    context.profile.account_type === "MANAGER" ||
    hasDirectorRole

  return (
    <ApprovalDataTable
      reports={reports}
      canSupervisorReview={canSupervisorReview}
      canDirectorReview={canDirectorReview}
      canPublishUpdate={canPublishUpdate}
    />
  )
}
