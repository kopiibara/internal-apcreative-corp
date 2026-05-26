"use client"

import {
  ApprovalDetailsGrid,
  ApprovalDiscussionSection,
  ApprovalDetailSection,
  ApprovalMainDetails,
  ApprovalMetadataPanel,
  ApprovalSheetHeader,
} from "@/components/shared/approval-details-display"
import { ApprovalPublishingActions } from "@/components/employee/approvals/approval-publishing-actions"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useContentReportStore } from "@/stores/use-content-report-store"

export function ContentReportDetailsSheet() {
  const {
    selectedContentReport,
    isDetailsSheetOpen,
    closeDetailsSheet,
  } = useContentReportStore()

  return (
    <Sheet
      open={isDetailsSheetOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDetailsSheet()
        }
      }}
    >
      <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden sm:max-w-4xl! sm:w-[50vw]!  px-4">
        <SheetHeader className="shrink-0 pb-4 ">
          {selectedContentReport ? (
            <ApprovalSheetHeader
              report={selectedContentReport}
              variant="employee"
            />
          ) : (
            <>
              <SheetTitle className="font-medium">Content Report Details</SheetTitle>
              <SheetDescription>
                View the submitted report, approval status, and review notes.
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {selectedContentReport ? (
          <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
            <>
              <ApprovalDetailsGrid
                main={
                  <>
                    <ApprovalMainDetails report={selectedContentReport} />
                    <ApprovalDiscussionSection report={selectedContentReport} />
                  </>
                }
                sidebar={<ApprovalMetadataPanel report={selectedContentReport} />}
              />
              {selectedContentReport.approvalPublishingPermissions
                ?.canPublishNow ||
              selectedContentReport.approvalPublishingPermissions
                ?.canSchedulePublish ? (
                <ApprovalDetailSection title="Publishing actions">
                  <ApprovalPublishingActions report={selectedContentReport} />
                </ApprovalDetailSection>
              ) : null}
            </>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
