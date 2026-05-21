import { ApprovalKanbanBoard } from "@/components/admin/approvals/approval-kanban-board"
import { getApprovalContentReports } from "@/lib/content-reports"
import {
  can,
  canDirectorReview as checkDirectorReviewAccess,
  requirePermission,
} from "@/lib/permissions"

type ApprovalsPageProps = {
  searchParams: Promise<{
    approvalId?: string
  }>
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const { approvalId } = await searchParams
  const context = await requirePermission("approvals.view")
  const [reports, canSupervisorReview, canPublishUpdate, canDirectorReview] =
    await Promise.all([
      getApprovalContentReports(),
      can(context.profile.auth_user_id, "approvals.supervisor_review"),
      can(context.profile.auth_user_id, "approvals.publish_update"),
      checkDirectorReviewAccess(
        context.profile.auth_user_id,
        context.profile.id
      ),
    ])

  return (
    <ApprovalKanbanBoard
      reports={reports}
      accountType={context.profile.account_type}
      canSupervisorReview={canSupervisorReview}
      canDirectorReview={canDirectorReview}
      canPublishUpdate={canPublishUpdate}
      approvalId={approvalId}
    />
  )
}
