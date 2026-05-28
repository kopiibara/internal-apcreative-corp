"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  updateApprovalKanbanColumn,
  updateDirectorReview,
  updatePublishingInfo,
  updateSupervisorReview,
} from "@/app/admin/approvals/actions"
import { ApprovalRevisionRequestFields } from "@/components/admin/approvals/approval-revision-request-fields"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RequiredLabel } from "@/components/ui/required-label"
import { Textarea } from "@/components/ui/textarea"
import type { ApprovalRevisionAreaId } from "@/lib/approvals/approval-revision"
import {
  normalizeRichTextForStorage,
  richTextToPlainText,
} from "@/lib/rich-text/rich-text"
import {
  type ApprovalVerificationPayload,
  useApprovalStore,
} from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type ApprovalVerificationDialogProps = {
  onApprovalUpdated?: (approval: ContentReport) => void
}

function isRevisionPayload(payload: ApprovalVerificationPayload) {
  if (payload.type === "kanban") {
    return payload.toColumn === "revision"
  }

  if (payload.type === "supervisor") {
    return payload.supervisorStatus === "Revision"
  }

  if (payload.type === "director") {
    return payload.directorStatus === "Revision"
  }

  return false
}

export function ApprovalVerificationDialog({
  onApprovalUpdated,
}: ApprovalVerificationDialogProps) {
  const {
    verificationPayload,
    isVerificationDialogOpen,
    closeVerificationDialog,
  } = useApprovalStore()

  function handleCancel() {
    verificationPayload?.onCancelled?.()
    closeVerificationDialog()
  }

  const dialogKey = verificationPayload
    ? verificationPayload.type === "director"
      ? `director-${verificationPayload.report.id}-${verificationPayload.directorStatus}`
      : verificationPayload.type === "supervisor"
        ? `supervisor-${verificationPayload.report.id}-${verificationPayload.supervisorStatus}`
        : verificationPayload.type === "kanban"
          ? `kanban-${verificationPayload.report.id}-${verificationPayload.toColumn}`
          : `${verificationPayload.type}-${verificationPayload.report.id}`
    : "approval-verification"

  return (
    <Dialog
      open={isVerificationDialogOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel()
        }
      }}
    >
      {verificationPayload ? (
        <ApprovalVerificationDialogContent
          key={dialogKey}
          payload={verificationPayload}
          onApprovalUpdated={onApprovalUpdated}
        />
      ) : null}
    </Dialog>
  )
}

function ApprovalVerificationDialogContent({
  payload,
  onApprovalUpdated,
}: {
  payload: ApprovalVerificationPayload
  onApprovalUpdated?: ApprovalVerificationDialogProps["onApprovalUpdated"]
}) {
  const router = useRouter()
  const closeVerificationDialog = useApprovalStore(
    (state) => state.closeVerificationDialog,
  )
  const clearPendingKanbanMove = useApprovalStore(
    (state) => state.clearPendingKanbanMove,
  )
  const updateApprovalInStore = useApprovalStore(
    (state) => state.updateApprovalInStore,
  )
  const isRevisionRequest = isRevisionPayload(payload)
  const [notes, setNotes] = useState(payload.notes)
  const [revisionAreas, setRevisionAreas] = useState<ApprovalRevisionAreaId[]>(
    [],
  )
  const [revisionInstruction, setRevisionInstruction] = useState("")
  const [otherExplanation, setOtherExplanation] = useState("")
  const [confirmationAccepted, setConfirmationAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canConfirm = isRevisionRequest
    ? revisionAreas.length > 0 &&
      richTextToPlainText(revisionInstruction).length > 0 &&
      (!revisionAreas.includes("other") || otherExplanation.trim().length > 0) &&
      confirmationAccepted
    : notes.trim().length > 0 && confirmationAccepted

  const actionSummary =
    payload.type === "kanban"
      ? payload.toColumn === "ready-to-publish"
        ? "This will approve your review lane and move the submission to Ready to Publish if both approvals are complete."
        : payload.toColumn === "revision"
          ? "This will send the request back to the creator with structured revision feedback."
          : "This will update the approval workflow for the selected column."
      : payload.type === "director" && payload.directorStatus === "Approved"
        ? "This will mark Director review as Approved and move the submission to Ready to Publish if Supervisor approval is complete."
        : isRevisionRequest
          ? "This will send the request back to the creator with structured revision feedback."
          : null

  function handleCancel() {
    payload.onCancelled?.()
    closeVerificationDialog()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isRevisionRequest) {
      if (revisionAreas.length === 0) {
        toast.error("Select at least one revision area.")
        return
      }

      if (!richTextToPlainText(revisionInstruction)) {
        toast.error("Add a clear revision instruction for the creator.")
        return
      }

      if (revisionAreas.includes("other") && !otherExplanation.trim()) {
        toast.error("Add a short explanation when Other is selected.")
        return
      }
    } else if (!notes.trim()) {
      toast.error("Please add a note before updating this approval.")
      return
    }

    if (!confirmationAccepted) {
      toast.error("Please confirm this approval update before continuing.")
      return
    }

    const revisionPayload = isRevisionRequest
      ? {
          revisionAreas,
          revisionInstruction: normalizeRichTextForStorage(revisionInstruction),
          otherExplanation: otherExplanation.trim() || undefined,
        }
      : {}

    startTransition(async () => {
      const result =
        payload.type === "supervisor"
          ? await updateSupervisorReview({
              reportId: payload.report.id,
              supervisorStatus: payload.supervisorStatus,
              supervisorNotes: isRevisionRequest ? undefined : notes,
              confirmationAccepted,
              ...revisionPayload,
            })
          : payload.type === "director"
            ? await updateDirectorReview({
                reportId: payload.report.id,
                directorStatus: payload.directorStatus,
                directorNotes: isRevisionRequest ? undefined : notes,
                confirmationAccepted,
                ...revisionPayload,
              })
            : payload.type === "publishing"
              ? await updatePublishingInfo({
                  reportId: payload.report.id,
                  publishStatus: payload.publishStatus,
                  scheduledPublishedDate: payload.scheduledPublishedDate,
                  proofUrl: payload.proofUrl,
                  remarksRevisionSummary: notes,
                  confirmationAccepted,
                })
              : await updateApprovalKanbanColumn({
                  reportId: payload.report.id,
                  fromColumn: payload.fromColumn,
                  toColumn: payload.toColumn,
                  notes: isRevisionRequest ? undefined : notes,
                  confirmationAccepted,
                  ...revisionPayload,
                })

      if (result.success) {
        toast.success(result.message)
        const updatedApproval = result.data?.updatedApproval

        if (updatedApproval) {
          updateApprovalInStore(updatedApproval)
          onApprovalUpdated?.(updatedApproval)
        }
        closeVerificationDialog()
        payload.onSaved?.(updatedApproval)
        router.refresh()
        return
      }

      if (payload.type === "kanban") {
        clearPendingKanbanMove()
        payload.onCancelled?.()
      }
      toast.error(result.message)
    })
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {isRevisionRequest ? "Request Revision" : "Approval Verification"}
        </DialogTitle>
        <DialogDescription>
          {isRevisionRequest
            ? "Select the areas that need revision and explain what the creator should change. This feedback is stored separately from general comments."
            : "Please add a note and confirm this approval update. The action will be recorded under your authenticated account."}
          {actionSummary ? ` ${actionSummary}` : ""}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRevisionRequest ? (
          <ApprovalRevisionRequestFields
            report={payload.report}
            revisionAreas={revisionAreas}
            revisionInstruction={revisionInstruction}
            otherExplanation={otherExplanation}
            onRevisionAreasChange={setRevisionAreas}
            onRevisionInstructionChange={setRevisionInstruction}
            onOtherExplanationChange={setOtherExplanation}
            disabled={isPending}
          />
        ) : (
          <div className="space-y-2">
            <RequiredLabel htmlFor="approval-verification-notes" required>
              Notes / reason
            </RequiredLabel>
            <Textarea
              id="approval-verification-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              className="min-h-28"
              required
            />
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id="approval-confirmation-accepted"
            checked={confirmationAccepted}
            onCheckedChange={(checked) =>
              setConfirmationAccepted(checked === true)
            }
            disabled={isPending}
          />
          <Label
            htmlFor="approval-confirmation-accepted"
            className="text-sm leading-relaxed"
          >
            I confirm that I reviewed this request and this action will be
            recorded under my account.
          </Label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !canConfirm}>
            {isPending
              ? "Confirming..."
              : isRevisionRequest
                ? "Confirm Revision"
                : "Confirm Update"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
