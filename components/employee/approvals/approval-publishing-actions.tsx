"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Send } from "lucide-react"
import { toast } from "sonner"

import {
  publishContentReportNow,
  scheduleContentReportPublishing,
} from "@/app/employee/approvals/actions"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ContentReport } from "@/types/content-report"

type ApprovalPublishingActionsProps = {
  report: ContentReport
  compact?: boolean
}

export function ApprovalPublishingActions({
  report,
  compact = false,
}: ApprovalPublishingActionsProps) {
  const router = useRouter()
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [proofUrl, setProofUrl] = useState(report.publishingProofUrl ?? "")
  const [proofNote, setProofNote] = useState(report.publishingProofNote ?? "")
  const [scheduledDate, setScheduledDate] = useState<string | null>(
    report.scheduledPublishedDate,
  )
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [scheduleProofUrl, setScheduleProofUrl] = useState(
    report.publishingProofUrl ?? "",
  )
  const [isPending, startTransition] = useTransition()
  const permissions = report.approvalPublishingPermissions
  const canPublishNow = permissions?.canPublishNow === true
  const canSchedulePublish = permissions?.canSchedulePublish === true

  if (!canPublishNow && !canSchedulePublish) {
    return null
  }

  function handlePublishSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!proofUrl.trim()) {
      toast.error("Publishing proof is required before publishing.")
      return
    }

    startTransition(async () => {
      const result = await publishContentReportNow({
        reportId: report.id,
        proofUrl,
        proofNote,
      })

      if (result.success) {
        toast.success(result.message)
        setIsPublishOpen(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  function handleScheduleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!scheduledDate) {
      toast.error("Scheduled publish date is required.")
      return
    }

    startTransition(async () => {
      const result = await scheduleContentReportPublishing({
        reportId: report.id,
        scheduledPublishedDate: scheduledDate,
        notes: scheduleNotes,
        proofUrl: scheduleProofUrl,
      })

      if (result.success) {
        toast.success(result.message)
        setIsScheduleOpen(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canPublishNow ? (
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          onClick={() => setIsPublishOpen(true)}
        >
          <Send className="size-4" />
          Publish Now
        </Button>
      ) : null}
      {canSchedulePublish ? (
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant="neutral"
          onClick={() => setIsScheduleOpen(true)}
        >
          <CalendarClock className="size-4" />
          Schedule Publish
        </Button>
      ) : null}

      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish approval request</DialogTitle>
            <DialogDescription>
              Submit publishing proof before this request becomes Published.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`publish-proof-${report.id}`}>
                Publishing proof URL
              </Label>
              <Input
                id={`publish-proof-${report.id}`}
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                placeholder="https://..."
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`publish-note-${report.id}`}>
                Optional notes
              </Label>
              <Textarea
                id={`publish-note-${report.id}`}
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                disabled={isPending}
                maxLength={2000}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="neutral"
                onClick={() => setIsPublishOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Publishing..." : "Publish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule publishing</DialogTitle>
            <DialogDescription>
              Choose when this approved request should be published.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Scheduled publish date</Label>
              <DateTimePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`schedule-proof-${report.id}`}>
                Optional proof URL
              </Label>
              <Input
                id={`schedule-proof-${report.id}`}
                value={scheduleProofUrl}
                onChange={(event) => setScheduleProofUrl(event.target.value)}
                placeholder="https://..."
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`schedule-note-${report.id}`}>
                Optional notes
              </Label>
              <Textarea
                id={`schedule-note-${report.id}`}
                value={scheduleNotes}
                onChange={(event) => setScheduleNotes(event.target.value)}
                disabled={isPending}
                maxLength={2000}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="neutral"
                onClick={() => setIsScheduleOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
