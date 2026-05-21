"use client"

import { useState } from "react"

import { ApprovalStatusSelect } from "@/components/admin/approvals/approval-status-select"
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
import type { ContentReport } from "@/types/content-report"

type SupervisorReviewFormProps = {
  report: ContentReport
  canEdit: boolean
  onSaved?: () => void
}

export function SupervisorReviewForm({
  report,
  canEdit,
  onSaved,
}: SupervisorReviewFormProps) {
  const openVerificationDialog = useApprovalStore(
    (state) => state.openVerificationDialog
  )
  const [status, setStatus] = useState(report.supervisorStatus)
  const [notes, setNotes] = useState(report.supervisorNotes ?? "")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    openVerificationDialog({
      type: "supervisor",
      report,
      supervisorStatus: status,
      notes,
      onSaved,
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Supervisor Approval</CardTitle>
        <CardDescription>
          Edit marketing supervisor status and notes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <ApprovalStatusSelect
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details-supervisor-notes">
              Marketing Supervisor Notes
            </Label>
            <Textarea
              id="details-supervisor-notes"
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
            Save Supervisor Review
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
