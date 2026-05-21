"use client"

import { ApprovalActivityTimeline } from "@/components/admin/approvals/approval-activity-timeline"
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
import { ScrollArea } from "@/components/ui/scroll-area"
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
      <SheetContent className="h-svh w-[95vw] sm:w-[50vw]! sm:max-w-[50vw]!">
        <SheetHeader>
          <SheetTitle>Approval Details</SheetTitle>
          <SheetDescription>
            Review the full content report and update approvals from this panel.
          </SheetDescription>
        </SheetHeader>

        {selectedApproval ? (
          <ScrollArea className="min-h-0 flex-1" scrollbars="vertical">
            <div className="space-y-6 px-6 pb-6">
              <ApprovalDetailsSummary report={selectedApproval} />
              <ApprovalActivityTimeline logs={selectedApproval.activityLogs} />
              <SupervisorReviewForm
                key={`supervisor-${selectedApproval.id}-${selectedApproval.supervisorStatus}-${selectedApproval.supervisorReviewedAt ?? "pending"}`}
                report={selectedApproval}
                canEdit={canSupervisorReview}
              />
              <DirectorReviewForm
                key={`director-${selectedApproval.id}-${selectedApproval.directorStatus}-${selectedApproval.directorReviewedAt ?? "pending"}`}
                report={selectedApproval}
                canEdit={canDirectorReview}
              />
              <PublishingReviewForm
                key={`publishing-${selectedApproval.id}-${selectedApproval.publishStatus}-${selectedApproval.scheduledPublishedDate ?? "pending"}`}
                report={selectedApproval}
                canPublishUpdate={canPublishUpdate}
              />
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
