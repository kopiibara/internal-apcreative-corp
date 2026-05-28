"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateTask } from "@/app/admin/to-do/actions"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RequiredLabel } from "@/components/ui/required-label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TASK_PRIORITIES } from "@/lib/tasks/task-type"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"

type TaskEditDialogProps = {
  assignment: TaskAssignmentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function TaskEditDialogContent({
  assignment,
  onOpenChange,
}: {
  assignment: TaskAssignmentRecord
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(assignment.title)
  const [description, setDescription] = useState(assignment.description ?? "")
  const [dueDate, setDueDate] = useState<string | null>(assignment.dueDate)
  const [priority, setPriority] = useState(assignment.priority ?? "none")
  const isDone = assignment.status === "DONE"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isDone) {
      toast.error(
        "This task is already done. Only the status can be changed with confirmation."
      )
      return
    }

    startTransition(async () => {
      const result = await updateTask({
        taskId: assignment.taskId,
        title,
        description,
        dueDate,
        priority: priority === "none" ? null : priority,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogDescription>
          Update shared task details for all assignees on this task.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-task-title" required>
            Title
          </RequiredLabel>
          <Input
            id="edit-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={isPending || isDone}
          />
        </div>

        <RichTextEditor
          id="edit-task-description"
          label="Description"
          value={description}
          onChange={setDescription}
          disabled={isPending || isDone}
          minHeight={140}
          placeholder="Add task context, instructions, links, or checklist items."
        />

        <div className="space-y-2">
          <RequiredLabel required={assignment.taskType === "GRADED"}>
            Due date
          </RequiredLabel>
          <DateTimePicker
            value={dueDate}
            onChange={setDueDate}
            disabled={isPending || isDone}
          />
        </div>

        <div className="space-y-2">
          <RequiredLabel>Priority</RequiredLabel>
          <Select
            value={priority}
            onValueChange={setPriority}
            disabled={isPending || isDone}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No priority</SelectItem>
              {TASK_PRIORITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="neutral"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || isDone}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function TaskEditDialog({
  assignment,
  open,
  onOpenChange,
}: TaskEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {assignment && open ? (
          <TaskEditDialogContent
            key={assignment.assignmentId}
            assignment={assignment}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
