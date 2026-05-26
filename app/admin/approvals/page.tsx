import { ApprovalKanbanBoard } from "@/components/admin/approvals/approval-kanban-board"
import { getApprovalContentReports } from "@/lib/content-reports"
import {
  canApprovalAction,
  canDirectorReview as checkDirectorReviewAccess,
  requirePermission,
} from "@/lib/permissions"

export const dynamic = "force-dynamic"

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
      canApprovalAction(
        context.profile.auth_user_id,
        context.profile.id,
        "approvals.supervisor_review"
      ),
      canApprovalAction(
        context.profile.auth_user_id,
        context.profile.id,
        "approvals.publish_update"
      ),
      checkDirectorReviewAccess(
        context.profile.auth_user_id,
        context.profile.id
      ),
    ])

  return (
    <ApprovalKanbanBoard
      reports={reports}
      accountType={context.profile.account_type}
      position={context.profile.position}
      canSupervisorReview={canSupervisorReview}
      canDirectorReview={canDirectorReview}
      canPublishUpdate={canPublishUpdate}
      approvalId={approvalId}
    />
  )
}
