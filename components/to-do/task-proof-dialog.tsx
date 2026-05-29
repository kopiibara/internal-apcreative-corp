"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { submitTaskProof } from "@/app/admin/to-do/actions"
import { TaskProofFileField } from "@/components/to-do/task-proof-file-field"
import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  TASK_PROOF_SUBMIT_TYPES,
  type TaskProofSubmitType,
} from "@/lib/tasks/task-type"
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
  const [proofType, setProofType] = useState<TaskProofSubmitType>("LINK")
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

  function handleProofTypeChange(nextType: TaskProofSubmitType) {
    setProofType(nextType)
    setProofUrl("")
    setProofNote("")
  }

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

  const canSubmit =
    proofType === "NOTE"
      ? proofNote.trim().length > 0
      : proofType === "LINK"
        ? proofUrl.trim().length > 0
        : proofUrl.trim().length > 0

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Proof type</Label>
            <Select
              value={proofType}
              onValueChange={(value) =>
                handleProofTypeChange(value as TaskProofSubmitType)
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PROOF_SUBMIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {proofType === "LINK" ? (
            <div className="space-y-2">
              <Label htmlFor="proof-url">Proof URL</Label>
              <Input
                id="proof-url"
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                placeholder="https://..."
                disabled={isPending}
              />
            </div>
          ) : null}

          {proofType === "IMAGE" ? (
            <>
              <TaskProofFileField
                value={proofUrl}
                disabled={isPending}
                onChange={setProofUrl}
                onClear={() => setProofUrl("")}
              />
              {proofUrl ? (
                <TaskProofDisplay
                  proofType={proofType}
                  proofUrl={proofUrl}
                  mediaClassName="max-h-40"
                />
              ) : null}
            </>
          ) : null}

          {proofType === "NOTE" ? (
            <div className="space-y-2">
              <Label htmlFor="proof-note">Proof note</Label>
              <Textarea
                id="proof-note"
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                className="min-h-24"
                disabled={isPending}
              />
            </div>
          ) : null}

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
