"use client"

import { ApprovalDetailsSummary } from "@/components/admin/approvals/approval-details-summary"
import { DirectorReviewForm } from "@/components/admin/approvals/director-review-form"
import { PublishingReviewForm } from "@/components/admin/approvals/publishing-review-form"
import { SupervisorReviewForm } from "@/components/admin/approvals/supervisor-review-form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useApprovalStore } from "@/stores/use-approval-store"

type ApprovalDetailsSheetProps = {
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}

export function ApprovalDetailsSheet({
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
}: ApprovalDetailsSheetProps) {
  const {
    selectedApproval,
    isDetailsSheetOpen,
    closeDetailsSheet,
  } = useApprovalStore()

  return (
    <Sheet
      open={isDetailsSheetOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDetailsSheet()
        }
      }}
    >
      <SheetContent className="h-svh w-[95vw] overflow-y-auto sm:w-[50vw]! sm:max-w-[50vw]!">
        <SheetHeader>
          <SheetTitle>Approval Details</SheetTitle>
          <SheetDescription>
            Review the full content report and update approvals from this panel.
          </SheetDescription>
        </SheetHeader>

        {selectedApproval ? (
          <div className="space-y-6 px-6 pb-6">
            <ApprovalDetailsSummary report={selectedApproval} />
            <SupervisorReviewForm
              report={selectedApproval}
              canEdit={canSupervisorReview}
            />
            <DirectorReviewForm
              report={selectedApproval}
              canEdit={canDirectorReview}
            />
            <PublishingReviewForm
              report={selectedApproval}
              canPublishUpdate={canPublishUpdate}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
