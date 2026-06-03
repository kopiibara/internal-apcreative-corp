"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateTaskScoringOverride } from "@/app/admin/to-do/actions"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  calculateLateTaskDeductionPoints,
  calculateLateMinutes,
  getEffectiveTaskPointsAwarded,
} from "@/lib/performance-scoring"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskScoringOverrideDialogProps = {
  assignment: TaskAssignmentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getAutomaticLateDeduction(assignment: TaskAssignmentRecord) {
  return calculateLateTaskDeductionPoints(
    calculateLateMinutes(assignment.submittedAt, assignment.dueDate),
  )
}

export function TaskScoringOverrideDialog({
  assignment,
  open,
  onOpenChange,
}: TaskScoringOverrideDialogProps) {
  const router = useRouter()
  const updateTaskAssignmentInStore = useTaskStore(
    (state) => state.updateTaskAssignmentInStore,
  )
  const [isPending, startTransition] = useTransition()
  const automaticPoints = assignment
    ? getEffectiveTaskPointsAwarded({
      status: assignment.status,
      pointsAwardedOverride: null,
    })
    : 15
  const automaticDeduction = assignment
    ? getAutomaticLateDeduction(assignment)
    : 0
  const defaultPointsAwarded = String(
    assignment?.pointsAwardedOverride ?? automaticPoints,
  )
  const defaultLateDeduction = String(
    assignment?.lateDeductionOverride ?? automaticDeduction,
  )
  const defaultReason = assignment?.scoringOverrideReason ?? ""

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignment) {
      return
    }

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await updateTaskScoringOverride({
        assignmentId: assignment.assignmentId,
        pointsAwarded: String(formData.get("pointsAwarded") ?? ""),
        lateDeduction: String(formData.get("lateDeduction") ?? ""),
        reason: String(formData.get("reason") ?? ""),
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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Task Scoring</DialogTitle>
          <DialogDescription>
            Override awarded points or late deduction for &quot;{assignment?.title}&quot;.
          </DialogDescription>
        </DialogHeader>

        <form
          key={`${assignment?.assignmentId ?? "none"}-${defaultPointsAwarded}-${defaultLateDeduction}`}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-points-awarded">Points awarded</Label>
                <Input
                  id="task-points-awarded"
                  name="pointsAwarded"
                  type="number"
                  min={0}
                  max={500}
                  step={1}
                  defaultValue={defaultPointsAwarded}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-late-deduction">Late deduction</Label>
                <Input
                  id="task-late-deduction"
                  name="lateDeduction"
                  type="number"
                  min={0}
                  max={500}
                  step={1}
                  defaultValue={defaultLateDeduction}
                  disabled={isPending}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-scoring-reason">Reason</Label>
              <Textarea
                id="task-scoring-reason"
                name="reason"
                defaultValue={defaultReason}
                disabled={isPending}
                className="min-h-28"
                required
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Scoring"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
