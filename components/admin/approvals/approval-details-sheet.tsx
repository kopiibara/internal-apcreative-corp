"use client"

import {
  AdminApprovalReviewActionsPanel,
} from "@/components/admin/approvals/approval-review-sidebar"
import {
  ApprovalActivitySection,
  ApprovalCommentsSection,
  ApprovalDetailsGrid,
  ApprovalMainDetails,
  ApprovalMetadataPanel,
  ApprovalSheetHeader,
} from "@/components/shared/approval-details-display"
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
      <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden px-4 sm:max-w-4xl! sm:w-[50vw]! xl:max-w-6xl!">
        <SheetHeader className="shrink-0 pb-4">
          {selectedApproval ? (
            <ApprovalSheetHeader report={selectedApproval} variant="admin" />
          ) : (
            <>
              <SheetTitle>Approval Details</SheetTitle>
              <SheetDescription>
                Review the full content report and update approvals from this panel.
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {selectedApproval ? (
          <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
            <div className="space-y-4 pb-6">
              <ApprovalDetailsGrid
                main={
                  <>
                    <ApprovalMainDetails report={selectedApproval} />
                    <ApprovalCommentsSection report={selectedApproval} />
                    <ApprovalActivitySection report={selectedApproval} />
                  </>
                }
                sidebar={
                  <>
                    <ApprovalMetadataPanel report={selectedApproval} />
                  </>
                }
              />
              <AdminApprovalReviewActionsPanel
                report={selectedApproval}
                canSupervisorReview={canSupervisorReview}
                canDirectorReview={canDirectorReview}
                canPublishUpdate={canPublishUpdate}
              />
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
