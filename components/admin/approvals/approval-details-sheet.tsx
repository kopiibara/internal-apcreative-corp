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
import { ApprovalNeedsRevisionPanel } from "@/components/shared/approval-needs-revision-panel"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { resolveApprovalReport } from "@/lib/approvals/approval-filters"
import type { AccountType } from "@/lib/auth/account-type"
import { useApprovalStore } from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type ApprovalDetailsSheetProps = {
  reports: ContentReport[]
  accountType: AccountType
  position?: string | null
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}

export function ApprovalDetailsSheet({
  reports,
  accountType,
  position,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
}: ApprovalDetailsSheetProps) {
  const {
    selectedApproval,
    approvalPatches,
    isDetailsSheetOpen,
    closeDetailsSheet,
  } = useApprovalStore()

  const resolvedApproval = selectedApproval
    ? resolveApprovalReport(selectedApproval, approvalPatches, reports)
    : null

  return (
    <Sheet
      open={isDetailsSheetOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDetailsSheet()
        }
      }}
    >
      <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden sm:max-w-4xl! sm:w-[50vw]! xl:max-w-6xl!">
        <SheetHeader className="shrink-0 border-b-2 border-border px-4 pb-4">
          {resolvedApproval ? (
            <ApprovalSheetHeader
              report={resolvedApproval}
              variant="admin"
              accountType={accountType}
              position={position}
            />
          ) : (
            <>
              <SheetTitle>Approval Details</SheetTitle>
              <SheetDescription>
                Review the full content report and update approvals from this panel.
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {resolvedApproval ? (
          <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
            <ApprovalDetailsGrid
              main={
                <>
                  <ApprovalNeedsRevisionPanel report={resolvedApproval} />
                  <ApprovalMainDetails report={resolvedApproval} />
                  <ApprovalCommentsSection report={resolvedApproval} />
                  <ApprovalActivitySection report={resolvedApproval} />
                </>
              }
              sidebar={
                <>
                  <ApprovalMetadataPanel report={resolvedApproval} />
                </>
              }
            />
            <div className="px-4 pb-4">
              <AdminApprovalReviewActionsPanel
                report={resolvedApproval}
                accountType={accountType}
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
