"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  changeTaskAssignmentStatus,
  confirmTaskBlocker,
} from "@/app/admin/to-do/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  getTaskStatusLabel,
  TASK_STATUSES,
  type TaskAssignmentStatus,
} from "@/lib/task-statuses"
import type { TaskAssignmentRecord } from "@/lib/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskStatusChangeDialogProps = {
  assignment: TaskAssignmentRecord | null
  toStatus?: TaskAssignmentStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignmentUpdated?: (assignment: TaskAssignmentRecord) => void
}

export function TaskStatusChangeDialog({
  assignment,
  toStatus,
  open,
  onOpenChange,
  onAssignmentUpdated,
}: TaskStatusChangeDialogProps) {
  const router = useRouter()
  const updateTaskAssignmentInStore = useTaskStore(
    (state) => state.updateTaskAssignmentInStore
  )
  const [notes, setNotes] = useState("")
  const [selectedStatus, setSelectedStatus] =
    useState<TaskAssignmentStatus | null>(toStatus ?? null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [confirmationAccepted, setConfirmationAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const effectiveToStatus = toStatus ?? selectedStatus
  const isBlockerReview = assignment?.status === "BLOCKER"
  const canSubmit =
    Boolean(assignment && effectiveToStatus && notes.trim()) &&
    confirmationAccepted

  function resetForm() {
    setNotes("")
    setSelectedStatus(toStatus ?? null)
    setDueDate(null)
    setConfirmationAccepted(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignment || !effectiveToStatus) {
      return
    }

    if (!notes.trim()) {
      toast.error("Please add a note before updating this task.")
      return
    }

    if (!confirmationAccepted) {
      toast.error("Verification failed. Please try again.")
      return
    }

    startTransition(async () => {
      const result = isBlockerReview
        ? await confirmTaskBlocker({
            assignmentId: assignment.assignmentId,
            resolutionNote: notes.trim(),
            dueDate: dueDate ?? assignment.dueDate,
            nextStatus: effectiveToStatus,
            confirmationAccepted,
          })
        : await changeTaskAssignmentStatus({
            assignmentId: assignment.assignmentId,
            fromStatus: assignment.status,
            toStatus: effectiveToStatus,
            notes: notes.trim(),
            confirmationAccepted,
          })

      if (result.success) {
        toast.success(result.message)
        const updatedAssignment = result.data?.updatedAssignment

        if (updatedAssignment) {
          updateTaskAssignmentInStore(updatedAssignment)
          onAssignmentUpdated?.(updatedAssignment)
        }

        resetForm()
        onOpenChange(false)
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
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Task Status Change</DialogTitle>
          <DialogDescription>
            Add notes and confirm this task update. The action will be recorded
            under your authenticated account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!toStatus ? (
            <div className="space-y-2">
              <Label>Next status</Label>
              <Select
                value={selectedStatus ?? undefined}
                onValueChange={(value) =>
                  setSelectedStatus(value as TaskAssignmentStatus)
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.filter(
                    (status) => status !== assignment?.status
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getTaskStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isBlockerReview ? (
            <div className="space-y-2">
              <Label>Deadline</Label>
              <DateTimePicker
                value={dueDate ?? assignment?.dueDate ?? null}
                onChange={setDueDate}
                disabled={isPending}
                placeholder="Optional deadline update"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="task-status-change-notes">
              Notes / reason / comments
            </Label>
            <Textarea
              id="task-status-change-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              className="min-h-28"
              required
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="task-status-change-confirmation"
              checked={confirmationAccepted}
              onCheckedChange={(checked) =>
                setConfirmationAccepted(checked === true)
              }
              disabled={isPending}
            />
            <Label
              htmlFor="task-status-change-confirmation"
              className="text-sm leading-relaxed"
            >
              I confirm that I reviewed this task and this action will be
              recorded under my account.
            </Label>
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
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
