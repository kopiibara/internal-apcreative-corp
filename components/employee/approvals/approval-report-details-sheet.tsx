"use client"

import { ContentReportDetailsSummary } from "@/components/employee/approvals/approval-report-details-summary"
import { ReviewNotesSummary } from "@/components/employee/approvals/review-notes-summary"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
      <SheetContent className="h-svh w-[95vw] overflow-y-auto sm:w-[50vw]! sm:max-w-[50vw]!">
        <SheetHeader>
          <SheetTitle>Content Report Details</SheetTitle>
          <SheetDescription>
            View the submitted report, approval status, and review notes.
          </SheetDescription>
        </SheetHeader>

        {selectedContentReport ? (
          <div className="space-y-6 px-6 pb-6">
            <ContentReportDetailsSummary report={selectedContentReport} />
            <ReviewNotesSummary report={selectedContentReport} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
