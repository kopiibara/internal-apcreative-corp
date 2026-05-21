"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { submitTaskProof } from "@/app/admin/to-do/actions"
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
import { TASK_PROOF_TYPES } from "@/lib/task-type"
import type { TaskAssignmentRecord } from "@/lib/tasks"
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
  const [proofType, setProofType] = useState<string>("LINK")
  const [proofUrl, setProofUrl] = useState("")
  const [proofNote, setProofNote] = useState("")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignment) {
      return
    }

    startTransition(async () => {
      const result = await submitTaskProof({
        assignmentId: assignment.assignmentId,
        proofType: proofType as (typeof TASK_PROOF_TYPES)[number],
        proofUrl: proofUrl.trim(),
        proofNote: proofNote.trim(),
      })

      if (result.success) {
        toast.success(result.message)
        if (result.data?.updatedAssignment) {
          updateTaskAssignmentInStore(result.data.updatedAssignment)
        }
        onOpenChange(false)
        setProofUrl("")
        setProofNote("")
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

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
            <Select value={proofType} onValueChange={setProofType} disabled={isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PROOF_TYPES.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    disabled={type === "IMAGE" || type === "VIDEO"}
                  >
                    {type === "IMAGE" || type === "VIDEO"
                      ? `${type} (unavailable)`
                      : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {proofType === "IMAGE" || proofType === "VIDEO" ? (
              <p className="text-xs text-muted-foreground">
                File upload is not available yet. Please use LINK or NOTE for now.
              </p>
            ) : null}
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
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || proofType === "IMAGE" || proofType === "VIDEO"
              }
            >
              {isPending ? "Submitting..." : "Submit Proof"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
