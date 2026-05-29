"use client"

import { Pencil } from "lucide-react"

import {
  ApprovalDetailsGrid,
  ApprovalDiscussionSection,
  ApprovalDetailSection,
  ApprovalMainDetails,
  ApprovalMetadataPanel,
  ApprovalSheetHeader,
} from "@/components/shared/approval-details-display"
import { ApprovalNeedsRevisionPanel } from "@/components/shared/approval-needs-revision-panel"
import { ApprovalPublishingActions } from "@/components/employee/approvals/approval-publishing-actions"
import { getApprovalPublishingPermissions } from "@/lib/approvals/approval-publishing-permissions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { canEmployeeEditOwnReport } from "@/types/content-report"
import { useContentReportStore } from "@/stores/use-content-report-store"

type ContentReportDetailsSheetProps = {
  currentProfileId: number
}

export function ContentReportDetailsSheet({
  currentProfileId,
}: ContentReportDetailsSheetProps) {
  const {
    selectedContentReport,
    isDetailsSheetOpen,
    closeDetailsSheet,
    openEditDialog,
  } = useContentReportStore()

  const canEdit =
    selectedContentReport != null &&
    canEmployeeEditOwnReport(selectedContentReport, currentProfileId)

  const publishingPermissions = selectedContentReport
    ? getApprovalPublishingPermissions(selectedContentReport)
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
      <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden px-4 sm:w-[50vw]! sm:max-w-4xl!">
        <SheetHeader className="shrink-0 pb-4">
          {selectedContentReport ? (
            <ApprovalSheetHeader
              report={selectedContentReport}
              variant="employee"
            />
          ) : (
            <>
              <SheetTitle className="font-medium">
                Content Report Details
              </SheetTitle>
              <SheetDescription>
                View the submitted report, approval status, and review notes.
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {selectedContentReport ? (
          <ScrollArea className="h-0 min-h-0 flex-1 pr-3">
            <ApprovalDetailsGrid
              main={
                <>
                  <ApprovalNeedsRevisionPanel report={selectedContentReport} />
                  <ApprovalMainDetails report={selectedContentReport} />
                  <ApprovalDiscussionSection report={selectedContentReport} />
                </>
              }
              sidebar={
                <ApprovalMetadataPanel report={selectedContentReport} />
              }
            />

            {publishingPermissions?.canPublishNow ||
              publishingPermissions?.canSchedulePublish ? (
              <ApprovalDetailSection title="Publishing actions">
                <ApprovalPublishingActions
                  report={selectedContentReport}
                  publishingPermissions={publishingPermissions}
                />
              </ApprovalDetailSection>
            ) : null}
          </ScrollArea>
        ) : null}

        {canEdit && selectedContentReport ? (
          <SheetFooter className="sticky bottom-0 z-10 shrink-0 bg-background/95 px-0 py-3 pb-4! backdrop-blur">
            <Button
              type="button"
              variant="neutral"
              size="sm"
              className="w-fit"
              onClick={() => openEditDialog(selectedContentReport)}
            >
              <Pencil className="size-4" />
              Edit Approval
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}