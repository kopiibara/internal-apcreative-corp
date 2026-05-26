"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ApprovalStatusSelect } from "@/components/admin/approvals/approval-status-select"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useApprovalStore } from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type DirectorReviewFormProps = {
  report: ContentReport
  canEdit: boolean
  onSaved?: (updatedApproval?: ContentReport) => void
}

export function DirectorReviewForm({
  report,
  canEdit,
  onSaved,
}: DirectorReviewFormProps) {
  const approvalPatches = useApprovalStore((state) => state.approvalPatches)
  const latestReport = approvalPatches[report.id] ?? report

  return (
    <DirectorReviewFormFields
      key={`${latestReport.id}-${latestReport.directorStatus}`}
      report={latestReport}
      canEdit={canEdit}
      onSaved={onSaved}
    />
  )
}

function DirectorReviewFormFields({
  report,
  canEdit,
  onSaved,
}: DirectorReviewFormProps) {
  const openVerificationDialog = useApprovalStore(
    (state) => state.openVerificationDialog
  )
  const [status, setStatus] = useState(report.directorStatus)
  const [notes, setNotes] = useState(report.directorNotes ?? "")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canEdit) {
      toast.error("You do not have permission to perform Director Review.")
      return
    }

    const notesChanged =
      notes.trim() !== (report.directorNotes ?? "").trim()
    const statusChanged = status !== report.directorStatus

    if (!statusChanged && !notesChanged) {
      toast.error("Change the director status or notes before saving.")
      return
    }

    openVerificationDialog({
      type: "director",
      report: {
        ...report,
        directorStatus: status,
        directorNotes: notes,
      },
      directorStatus: status,
      notes,
      onSaved: (updatedApproval) => {
        onSaved?.(updatedApproval)
      },
    })
  }

  return (
    <Card size="default" className="w-full">
      <CardHeader>
        <CardTitle>Director Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">


          <div className="space-y-2">
            <Label>Director of Marketing Status</Label>
            <ApprovalStatusSelect
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={!canEdit}
            />
            {report.directorStatus === "Revision" ? (
              <p className="text-xs text-muted-foreground">
                This item is in revision. Choose Approved when it is ready to
                move to Ready to Publish.
              </p>
            ) : report.directorStatus === "Pending" ? (
              <p className="text-xs text-muted-foreground">
                Choose Approved, Revision, or Rejected. Saving notes alone does
                not approve the submission.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details-director-notes">Director Notes</Label>
            <Textarea
              id="details-director-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!canEdit}
              className="min-h-28"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!canEdit}
          >
            Save Director Review
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
