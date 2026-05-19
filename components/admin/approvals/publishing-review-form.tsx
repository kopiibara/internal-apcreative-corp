"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updatePublishingInfo } from "@/app/admin/approvals/actions"
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
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report"

type PublishingReviewFormProps = {
  report: ContentReport
  canPublishUpdate: boolean
  onSaved?: () => void
}

function toDateTimeLocal(value: string | null) {
  return value ? value.slice(0, 16) : ""
}

export function PublishingReviewForm({
  report,
  canPublishUpdate,
  onSaved,
}: PublishingReviewFormProps) {
  const router = useRouter()
  const canEdit = canPublishUpdate && canEditPublishingFields(report)
  const [publishStatus, setPublishStatus] = useState(report.publishStatus)
  const [scheduledDate, setScheduledDate] = useState(
    toDateTimeLocal(report.scheduledPublishedDate)
  )
  const [remarks, setRemarks] = useState(report.remarksRevisionSummary ?? "")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await updatePublishingInfo({
        reportId: report.id,
        publishStatus,
        scheduledPublishedDate: scheduledDate,
        remarksRevisionSummary: remarks,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        onSaved?.()
        return
      }

      toast.error(result.message)
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
              disabled={isPending || !canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Scheduled / Published Date</Label>
            <ScheduledDatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              disabled={isPending || !canEdit}
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
              disabled={isPending || !canEdit}
              className="min-h-28"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isPending || !canEdit}
          >
            {isPending ? "Saving..." : "Save Publishing Update"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
