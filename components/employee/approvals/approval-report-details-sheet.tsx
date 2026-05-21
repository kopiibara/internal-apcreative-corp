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
      <SheetContent className="h-svh w-[95vw] sm:w-[50vw]! sm:max-w-[50vw]!">
        <SheetHeader>
          <SheetTitle>Content Report Details</SheetTitle>
          <SheetDescription>
            View the submitted report, approval status, and review notes.
          </SheetDescription>
        </SheetHeader>

        {selectedContentReport ? (
          <ScrollArea className="min-h-0 flex-1" scrollbars="vertical">
            <div className="space-y-6 px-6 pb-6">
              <ContentReportDetailsSummary report={selectedContentReport} />
              <ReviewNotesSummary report={selectedContentReport} />
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
