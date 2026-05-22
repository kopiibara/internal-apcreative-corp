"use client"

import { DirectorReviewForm } from "@/components/admin/approvals/director-review-form"
import { PublishingReviewForm } from "@/components/admin/approvals/publishing-review-form"
import { SupervisorReviewForm } from "@/components/admin/approvals/supervisor-review-form"
import { ApprovalDetailSection } from "@/components/shared/approval-details-display"
import type { ContentReport } from "@/types/content-report"

type AdminApprovalReviewSidebarProps = {
  report: ContentReport
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}


export function AdminApprovalReviewActionsPanel({
  report,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
}: AdminApprovalReviewSidebarProps) {
  const showActions =
    canSupervisorReview || canDirectorReview || canPublishUpdate

  if (!showActions) {
    return null
  }

  return (
    <ApprovalDetailSection title="Review actions">
      <div className=" flex flex-row w-full justify-between gap-2">
        {canSupervisorReview ? (
          <SupervisorReviewForm
            key={`supervisor-${report.id}-${report.supervisorStatus}-${report.supervisorReviewedAt ?? "pending"}`}
            report={report}
            canEdit={canSupervisorReview}
          />
        ) : null}
        {canDirectorReview ? (
          <DirectorReviewForm
            key={`director-${report.id}-${report.directorStatus}-${report.directorReviewedAt ?? "pending"}`}
            report={report}
            canEdit={canDirectorReview}
          />
        ) : null}
        {canPublishUpdate ? (
          <PublishingReviewForm
            key={`publishing-${report.id}-${report.publishStatus}-${report.scheduledPublishedDate ?? "pending"}`}
            report={report}
            canPublishUpdate={canPublishUpdate}
          />
        ) : null}
      </div>
    </ApprovalDetailSection>
  )
}

/** @deprecated Use AdminApprovalReviewStatusPanel + AdminApprovalReviewActionsPanel */
export function AdminApprovalReviewSidebar(props: AdminApprovalReviewSidebarProps) {
  return (
    <>
      <AdminApprovalReviewActionsPanel {...props} />
    </>
  )
}
