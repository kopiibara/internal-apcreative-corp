"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { requestTaskRevision } from "@/app/admin/to-do/actions"
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
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"
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
  const [dueDate, setDueDate] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignment) {
      return
    }

    startTransition(async () => {
      const result = await requestTaskRevision({
        assignmentId: assignment.assignmentId,
        revisionNote,
        dueDate: dueDate ?? assignment.dueDate,
      })

      if (result.success) {
        toast.success(result.message)
        if (result.data?.updatedAssignment) {
          updateTaskAssignmentInStore(result.data.updatedAssignment)
        }
        onOpenChange(false)
        setRevisionNote("")
        setDueDate(null)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setRevisionNote("")
          setDueDate(null)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Revision</DialogTitle>
          <DialogDescription>
            Explain what needs to change for &quot;{assignment?.title}&quot;.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="space-y-4">
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
          <div className="space-y-2">
            <Label>Rescheduled deadline</Label>
            <DateTimePicker
              value={dueDate ?? assignment?.dueDate ?? null}
              onChange={setDueDate}
              disabled={isPending}
              placeholder="Set revised deadline"
            />
          </div>
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
            <Button type="submit" disabled={isPending || !revisionNote.trim()}>
              {isPending ? "Saving..." : "Request Revision"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
