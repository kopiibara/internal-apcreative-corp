"use client"

import { useState } from "react"
import { toast } from "sonner"

import { PublishStatusSelect } from "@/components/admin/approvals/publish-status-select"
import { ScheduledDatePicker } from "@/components/admin/approvals/scheduled-date-picker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  const [proofUrl, setProofUrl] = useState(report.publishingProofUrl ?? "")
  const [remarks, setRemarks] = useState(report.remarksRevisionSummary ?? "")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canEdit) {
      toast.error("You do not have permission to update Publishing.")
      return
    }

    openVerificationDialog({
      type: "publishing",
      report,
      publishStatus,
      scheduledPublishedDate: scheduledDate,
      proofUrl,
      notes: remarks,
      onSaved,
    })
  }

  return (
    <Card size="default" className="w-full">
      <CardHeader>
        <CardTitle>Publishing</CardTitle>
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

          {publishStatus === "Published" ? (
            <div className="space-y-2">
              <Label htmlFor="details-publishing-proof">
                Publishing proof URL
              </Label>
              <Input
                id="details-publishing-proof"
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
                required
              />
            </div>
          ) : null}

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
