"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { requestTaskRevision } from "@/app/admin/to-do/actions"
import { Button } from "@/components/ui/button"
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
import type { TaskAssignmentRecord } from "@/lib/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskRevisionDialogProps = {
  assignment: TaskAssignmentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskRevisionDialog({
  assignment,
  open,
  onOpenChange,
}: TaskRevisionDialogProps) {
  const router = useRouter()
  const updateTaskAssignmentInStore = useTaskStore(
    (state) => state.updateTaskAssignmentInStore
  )
  const [isPending, startTransition] = useTransition()
  const [revisionNote, setRevisionNote] = useState("")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignment) {
      return
    }

    startTransition(async () => {
      const result = await requestTaskRevision({
        assignmentId: assignment.assignmentId,
        revisionNote,
      })

      if (result.success) {
        toast.success(result.message)
        if (result.data?.updatedAssignment) {
          updateTaskAssignmentInStore(result.data.updatedAssignment)
        }
        onOpenChange(false)
        setRevisionNote("")
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
          <DialogTitle>Request Revision</DialogTitle>
          <DialogDescription>
            Explain what needs to change for &quot;{assignment?.title}&quot;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revision-note">Revision note</Label>
            <Textarea
              id="revision-note"
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
              className="min-h-28"
              required
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !revisionNote.trim()}>
              {isPending ? "Saving..." : "Request Revision"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
