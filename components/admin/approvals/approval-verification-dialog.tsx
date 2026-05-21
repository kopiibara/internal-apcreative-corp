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
import { Textarea } from "@/components/ui/textarea"
import {
  type ApprovalVerificationPayload,
  useApprovalStore,
} from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type ApprovalVerificationDialogProps = {
  onApprovalUpdated?: (approval: ContentReport) => void
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
    ? `${verificationPayload.type}-${verificationPayload.report.id}`
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
    (state) => state.closeVerificationDialog
  )
  const clearPendingKanbanMove = useApprovalStore(
    (state) => state.clearPendingKanbanMove
  )
  const setSelectedApproval = useApprovalStore(
    (state) => state.setSelectedApproval
  )
  const [notes, setNotes] = useState(payload.notes)
  const [confirmationAccepted, setConfirmationAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const canConfirm = notes.trim().length > 0 && confirmationAccepted

  function handleCancel() {
    payload.onCancelled?.()
    closeVerificationDialog()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!notes.trim()) {
      toast.error("Please add a note before updating this approval.")
      return
    }

    if (!confirmationAccepted) {
      toast.error("Please confirm this approval update before continuing.")
      return
    }

    startTransition(async () => {
      const result =
        payload.type === "supervisor"
          ? await updateSupervisorReview({
              reportId: payload.report.id,
              supervisorStatus: payload.supervisorStatus,
              supervisorNotes: notes,
              confirmationAccepted,
            })
          : payload.type === "director"
            ? await updateDirectorReview({
                reportId: payload.report.id,
                directorStatus: payload.directorStatus,
                directorNotes: notes,
                confirmationAccepted,
              })
            : payload.type === "publishing"
              ? await updatePublishingInfo({
                  reportId: payload.report.id,
                  publishStatus: payload.publishStatus,
                  scheduledPublishedDate: payload.scheduledPublishedDate,
                  remarksRevisionSummary: notes,
                  confirmationAccepted,
                })
              : await updateApprovalKanbanColumn({
                  reportId: payload.report.id,
                  fromColumn: payload.fromColumn,
                  toColumn: payload.toColumn,
                  notes,
                  confirmationAccepted,
                })

      if (result.success) {
        toast.success(result.message)
        const updatedApproval = result.data?.updatedApproval

        if (updatedApproval) {
          setSelectedApproval(updatedApproval)
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
          <DialogTitle>Approval Verification</DialogTitle>
          <DialogDescription>
            Please add a note and confirm this approval update. The action will
            be recorded under your authenticated account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval-verification-notes">
              Notes / reason
            </Label>
            <Textarea
              id="approval-verification-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              className="min-h-28"
              required
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3">
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
              {isPending ? "Confirming..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </form>
    </DialogContent>
  )
}
