"use client"

import { DirectorReviewForm } from "@/components/admin/approvals/director-review-form"
import { DirectorReviewReadonly } from "@/components/admin/approvals/director-review-readonly"
import { PublishingReviewForm } from "@/components/admin/approvals/publishing-review-form"
import { PublishingReviewReadonly } from "@/components/admin/approvals/publishing-review-readonly"
import { SupervisorReviewForm } from "@/components/admin/approvals/supervisor-review-form"
import { SupervisorReviewReadonly } from "@/components/admin/approvals/supervisor-review-readonly"
import { ApprovalDetailSection } from "@/components/shared/approval-details-display"
import { isFullStackDeveloperAdminReadOnly } from "@/lib/auth/full-stack-developer-access"
import type { AccountType } from "@/lib/auth/account-type"
import { useApprovalStore } from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type AdminApprovalReviewSidebarProps = {
  report: ContentReport
  accountType: AccountType
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}


export function AdminApprovalReviewActionsPanel({
  report,
  accountType,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
}: AdminApprovalReviewSidebarProps) {
  const updateApprovalInStore = useApprovalStore(
    (state) => state.updateApprovalInStore
  )
  const readOnly = isFullStackDeveloperAdminReadOnly(accountType)
  const showActions =
    readOnly ||
    canSupervisorReview ||
    canDirectorReview ||
    canPublishUpdate

  if (!showActions) {
    return null
  }

  return (
    <ApprovalDetailSection
      title={readOnly ? "Review status (read-only)" : "Review actions"}
    >
      <div className="flex w-full flex-row justify-between gap-2">
        {readOnly || !canSupervisorReview ? (
          <SupervisorReviewReadonly report={report} />
        ) : (
          <SupervisorReviewForm
            key={`supervisor-${report.id}-${report.supervisorStatus}-${report.supervisorReviewedAt ?? "pending"}`}
            report={report}
            canEdit={canSupervisorReview}
            onSaved={(updatedApproval) => {
              if (updatedApproval) {
                updateApprovalInStore(updatedApproval)
              }
            }}
          />
        )}
        {readOnly || !canDirectorReview ? (
          <DirectorReviewReadonly report={report} />
        ) : (
          <DirectorReviewForm
            key={`director-${report.id}-${report.directorStatus}-${report.directorReviewedAt ?? "pending"}`}
            report={report}
            canEdit={canDirectorReview}
            onSaved={(updatedApproval) => {
              if (updatedApproval) {
                updateApprovalInStore(updatedApproval)
              }
            }}
          />
        )}
        {readOnly || !canPublishUpdate ? (
          <PublishingReviewReadonly report={report} />
        ) : (
          <PublishingReviewForm
            key={`publishing-${report.id}-${report.publishStatus}-${report.scheduledPublishedDate ?? "pending"}`}
            report={report}
            canPublishUpdate={canPublishUpdate}
          />
        )}
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
