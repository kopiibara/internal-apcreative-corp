"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { submitTaskProof } from "@/app/admin/to-do/actions"
import { ProofSubmissionFields } from "@/components/shared/proof-submission-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { hasValidProofSubmission } from "@/lib/proof/proof-media"
import type { ProofSubmitType } from "@/lib/proof/proof-types"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskProofDialogProps = {
  assignment: TaskAssignmentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskProofDialog({
  assignment,
  open,
  onOpenChange,
}: TaskProofDialogProps) {
  const router = useRouter()
  const updateTaskAssignmentInStore = useTaskStore(
    (state) => state.updateTaskAssignmentInStore
  )
  const [isPending, startTransition] = useTransition()
  const [proofType, setProofType] = useState<ProofSubmitType>("LINK")
  const [proofUrl, setProofUrl] = useState("")
  const [proofNote, setProofNote] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }

    setProofType("LINK")
    setProofUrl("")
    setProofNote("")
  }, [open, assignment?.assignmentId])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignment) {
      return
    }

    startTransition(async () => {
      const result = await submitTaskProof({
        assignmentId: assignment.assignmentId,
        proofType,
        proofUrl: proofUrl.trim(),
        proofNote: proofNote.trim(),
      })

      if (result.success) {
        toast.success(result.message)
        if (result.data?.updatedAssignment) {
          updateTaskAssignmentInStore(result.data.updatedAssignment)
        }
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  const canSubmit = hasValidProofSubmission(proofType, proofUrl, proofNote)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Proof</DialogTitle>
          <DialogDescription>
            Add proof for &quot;{assignment?.title}&quot;. The task will move to
            Pending for review.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
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
            idPrefix="task-proof"
          />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? "Submitting..." : "Submit Proof"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
