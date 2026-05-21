"use client"

import { useState } from "react"

import { PublishStatusSelect } from "@/components/admin/approvals/publish-status-select"
import { ScheduledDatePicker } from "@/components/admin/approvals/scheduled-date-picker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useApprovalStore } from "@/stores/use-approval-store"
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report"

type PublishingReviewFormProps = {
  report: ContentReport
  canPublishUpdate: boolean
  onSaved?: () => void
}

export function PublishingReviewForm({
  report,
  canPublishUpdate,
  onSaved,
}: PublishingReviewFormProps) {
  const openVerificationDialog = useApprovalStore(
    (state) => state.openVerificationDialog
  )
  const canEdit = canPublishUpdate && canEditPublishingFields(report)
  const [publishStatus, setPublishStatus] = useState(report.publishStatus)
  const [scheduledDate, setScheduledDate] = useState<string | null>(
    report.scheduledPublishedDate
  )
  const [remarks, setRemarks] = useState(report.remarksRevisionSummary ?? "")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    openVerificationDialog({
      type: "publishing",
      report,
      publishStatus,
      scheduledPublishedDate: scheduledDate,
      notes: remarks,
      onSaved,
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Publishing</CardTitle>
        <CardDescription>
          Publish status and date unlock after both approvals are approved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Publish Status</Label>
            <PublishStatusSelect
              value={publishStatus}
              onValueChange={(value) =>
                setPublishStatus(value as typeof publishStatus)
              }
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Scheduled / Published Date</Label>
            <ScheduledDatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details-publishing-remarks">
              Remarks / Revision Summary
            </Label>
            <Textarea
              id="details-publishing-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              disabled={!canEdit}
              className="min-h-28"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!canEdit}
          >
            Save Publishing Update
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
