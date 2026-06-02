"use client"

import { Pencil } from "lucide-react"

import {
  ApprovalDetailsGrid,
  ApprovalDiscussionSection,
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

  const hasPublishingActions =
    publishingPermissions?.canPublishNow ||
    publishingPermissions?.canSchedulePublish

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
          <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
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

          </ScrollArea>
        ) : null}

        {selectedContentReport && (canEdit || hasPublishingActions) ? (
          <SheetFooter className="sticky bottom-0 z-10 mt-0 shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t-2 border-border bg-background/95 px-4 py-3 pb-4! backdrop-blur">
            {hasPublishingActions && publishingPermissions ? (
              <ApprovalPublishingActions
                report={selectedContentReport}
                publishingPermissions={publishingPermissions}
              />
            ) : null}
            {canEdit ? (
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
            ) : null}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
