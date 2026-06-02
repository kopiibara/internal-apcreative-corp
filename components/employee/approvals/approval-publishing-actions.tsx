"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Send } from "lucide-react"
import { toast } from "sonner"

import {
  publishContentReportNow,
  scheduleContentReportPublishing,
} from "@/app/employee/approvals/actions"
import { ProofSubmissionFields } from "@/components/shared/proof-submission-fields"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  hasValidProofSubmission,
  inferProofSubmitType,
} from "@/lib/proof/proof-media"
import type { ProofSubmitType } from "@/lib/proof/proof-types"
import type {
  ApprovalPublishingPermissions,
  ContentReport,
} from "@/types/content-report"

type ApprovalPublishingActionsProps = {
  report: ContentReport
  publishingPermissions: ApprovalPublishingPermissions
  compact?: boolean
}

export function ApprovalPublishingActions({
  report,
  publishingPermissions,
  compact = false,
}: ApprovalPublishingActionsProps) {
  const router = useRouter()
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [proofType, setProofType] = useState<ProofSubmitType>(
    inferProofSubmitType(report.publishingProofUrl, report.publishingProofNote) ??
      "LINK",
  )
  const [proofUrl, setProofUrl] = useState(report.publishingProofUrl ?? "")
  const [proofNote, setProofNote] = useState(report.publishingProofNote ?? "")
  const [scheduledDate, setScheduledDate] = useState<string | null>(
    report.scheduledPublishedDate,
  )
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [scheduleProofType, setScheduleProofType] = useState<ProofSubmitType>("LINK")
  const [scheduleProofUrl, setScheduleProofUrl] = useState(
    report.publishingProofUrl ?? "",
  )
  const [scheduleProofNote, setScheduleProofNote] = useState(
    report.publishingProofNote ?? "",
  )
  const [isPending, startTransition] = useTransition()
  const canPublishNow = publishingPermissions.canPublishNow
  const canSchedulePublish = publishingPermissions.canSchedulePublish

  if (!canPublishNow && !canSchedulePublish) {
    return null
  }

  function handlePublishSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasValidProofSubmission(proofType, proofUrl, proofNote)) {
      toast.error("Publishing proof is required before publishing.")
      return
    }

    startTransition(async () => {
      const result = await publishContentReportNow({
        reportId: report.id,
        proofType,
        proofUrl: proofUrl.trim(),
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

    const hasOptionalProof =
      scheduleProofType === "NOTE"
        ? scheduleProofNote.trim().length > 0
        : scheduleProofUrl.trim().length > 0 || scheduleProofNote.trim().length > 0

    startTransition(async () => {
      const result = await scheduleContentReportPublishing({
        reportId: report.id,
        scheduledPublishedDate: scheduledDate,
        notes: scheduleNotes,
        proofType: hasOptionalProof ? scheduleProofType : undefined,
        proofUrl: scheduleProofUrl.trim(),
        proofNote: scheduleProofNote,
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

  const canSubmitPublish = hasValidProofSubmission(proofType, proofUrl, proofNote)

  const publishButton = canPublishNow ? (
    <Button
      type="button"
      size={compact ? "icon-sm" : "default"}
      aria-label="Publish now"
      title="Publish now"
      onClick={() => setIsPublishOpen(true)}
    >
      <Send className={compact ? "size-3.5" : "size-4"} />
      {compact ? <span className="sr-only">Publish now</span> : "Publish Now"}
    </Button>
  ) : null

  const scheduleButton = canSchedulePublish ? (
    <Button
      type="button"
      size={compact ? "icon-sm" : "default"}
      variant="neutral"
      aria-label="Schedule publishing"
      title="Schedule publishing"
      onClick={() => setIsScheduleOpen(true)}
    >
      <CalendarClock className={compact ? "size-3.5" : "size-4"} />
      {compact ? <span className="sr-only">Schedule publishing</span> : "Schedule"}
    </Button>
  ) : null

  return (
    <div className={compact ? "contents" : "flex flex-wrap gap-2"}>
      {compact ? (
        <TooltipProvider>
          {publishButton ? (
            <Tooltip>
              <TooltipTrigger asChild>{publishButton}</TooltipTrigger>
              <TooltipContent>Publish now</TooltipContent>
            </Tooltip>
          ) : null}
          {scheduleButton ? (
            <Tooltip>
              <TooltipTrigger asChild>{scheduleButton}</TooltipTrigger>
              <TooltipContent>Schedule publishing</TooltipContent>
            </Tooltip>
          ) : null}
        </TooltipProvider>
      ) : (
        <>
          {publishButton}
          {scheduleButton}
        </>
      )}

      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish approval request</DialogTitle>
            <DialogDescription>
              Submit publishing proof before this request becomes Published.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handlePublishSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <DialogBody className="space-y-4">
            <ProofSubmissionFields
              proofType={proofType}
              proofUrl={proofUrl}
              proofNote={proofNote}
              disabled={isPending}
              onProofTypeChange={setProofType}
              onProofUrlChange={setProofUrl}
              onProofNoteChange={setProofNote}
              idPrefix={`publish-proof-${report.id}`}
              linkLabel="Publishing proof URL"
              noteLabel="Publishing proof note"
              noteMaxLength={2000}
            />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="neutral"
                onClick={() => setIsPublishOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !canSubmitPublish}>
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
              Choose when this approved request should be published. Proof is
              optional when scheduling.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleScheduleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>Scheduled publish date</Label>
              <DateTimePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                disabled={isPending}
              />
            </div>
            <ProofSubmissionFields
              proofType={scheduleProofType}
              proofUrl={scheduleProofUrl}
              proofNote={scheduleProofNote}
              disabled={isPending}
              onProofTypeChange={setScheduleProofType}
              onProofUrlChange={setScheduleProofUrl}
              onProofNoteChange={setScheduleProofNote}
              idPrefix={`schedule-proof-${report.id}`}
              linkLabel="Optional proof URL"
              noteLabel="Optional proof note"
              noteMaxLength={2000}
            />
            <div className="space-y-2">
              <Label htmlFor={`schedule-note-${report.id}`}>
                Optional schedule notes
              </Label>
              <Textarea
                id={`schedule-note-${report.id}`}
                value={scheduleNotes}
                onChange={(event) => setScheduleNotes(event.target.value)}
                disabled={isPending}
                maxLength={2000}
              />
            </div>
            </DialogBody>
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
