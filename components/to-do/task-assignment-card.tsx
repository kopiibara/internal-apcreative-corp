"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteTask } from "@/app/admin/to-do/actions"
import { ReportBlockerDialog } from "@/components/to-do/report-blocker-dialog"
import { TaskAssigneeBrands } from "@/components/to-do/task-assignee-brands"
import { TaskProofDialog } from "@/components/to-do/task-proof-dialog"
import { TaskRevisionDialog } from "@/components/to-do/task-revision-dialog"
import { TaskStatusChangeDialog } from "@/components/to-do/task-status-change-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { TaskStatusBadge } from "@/components/to-do/task-status-badge"
import { TaskTypeBadge } from "@/components/to-do/task-type-badge"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { isAssignmentCompletedOnTime } from "@/lib/task-type"
import type { TaskAssignmentRecord } from "@/lib/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskAssignmentCardProps = {
  assignment: TaskAssignmentRecord
  permissions: TaskPermissionFlags
  currentProfileId: number
  showAssignee?: boolean
  onOpenDetails?: (assignment: TaskAssignmentRecord) => void
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function TaskAssignmentCard({
  assignment,
  permissions,
  currentProfileId,
  showAssignee = true,
  onOpenDetails,
}: TaskAssignmentCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [proofOpen, setProofOpen] = useState(false)
  const [blockerOpen, setBlockerOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [doneDialogOpen, setDoneDialogOpen] = useState(false)
  const openEditDialog = useTaskStore((state) => state.openEditDialog)

  const onTimeStatus = isAssignmentCompletedOnTime(
    assignment.completedAt,
    assignment.dueDate
  )
  const isAssignee = assignment.assignedToProfileId === currentProfileId
  const canEditTask =
    assignment.status !== "DONE" &&
    (permissions.canManageAll ||
      assignment.createdByProfileId === currentProfileId)
  const canReviewTask = permissions.canReview && !isAssignee
  const hasProof =
    Boolean(assignment.proofUrl) || Boolean(assignment.proofNote)
  const hasBlocker = Boolean(assignment.blockerNote)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask({ taskId: assignment.taskId })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <>
      <Card
        size="sm"
        className="cursor-pointer rounded-md py-2 transition-colors hover:bg-muted/40"
        onClick={() => onOpenDetails?.(assignment)}
      >
        <CardContent className="space-y-3 px-4 py-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">
              {assignment.title}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1 flex-row">
              <TaskTypeBadge taskType={assignment.taskType} />
              <TaskStatusBadge status={assignment.status} />
            </div>

          </div>

          {assignment.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {assignment.description}
            </p>
          ) : null}

          {showAssignee ? (
            <p className="text-xs">
              <span className="text-muted-foreground">Assignee:</span>{" "}
              {assignment.assignedToName}
            </p>
          ) : null}

          <TaskAssigneeBrands brands={assignment.assigneeBrands} />

          <p className="text-xs">
            <span className="text-muted-foreground">Created by:</span>{" "}
            {assignment.createdByName}
          </p>
          <p className="text-xs">
            <span className="text-muted-foreground">Due:</span>{" "}
            {assignment.dueDate
              ? dateFormatter.format(new Date(assignment.dueDate))
              : "â€”"}
          </p>
          {assignment.priority ? (
            <StatusBadge
              status={assignment.priority}
              type="priority"
              size="sm"
              prefix="Priority"
            />
          ) : null}

          {hasProof ? (
            <StatusBadge status="SUBMITTED" type="proof" size="sm" />
          ) : null}

          {hasBlocker ? (
            <StatusBadge status="BLOCKER" type="task" size="sm">
              Blocker reported
            </StatusBadge>
          ) : null}

          {assignment.revisionNote ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {assignment.revisionNote}
            </p>
          ) : null}

          {assignment.status === "DONE" && onTimeStatus !== null ? (
            <StatusBadge
              status={onTimeStatus ? "ON_TIME" : "LATE"}
              type="proof"
              size="sm"
            />
          ) : null}

          <div
            className="flex flex-wrap gap-1.5 pt-1"
            onClick={(event) => event.stopPropagation()}
          >
            {isAssignee &&
              permissions.canSubmitProof &&
              ["ASSIGNED", "REVISION"].includes(assignment.status) ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setProofOpen(true)}
                  disabled={isPending}
                >
                  {assignment.status === "REVISION"
                    ? "Resubmit Proof"
                    : "Submit Proof"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={() => setBlockerOpen(true)}
                  disabled={isPending}
                >
                  Report Blocker
                </Button>
              </>
            ) : null}

            {canReviewTask && assignment.status === "PENDING" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDoneDialogOpen(true)}
                  disabled={isPending}
                >
                  Confirm Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={() => setRevisionOpen(true)}
                  disabled={isPending}
                >
                  Request Revision
                </Button>
              </>
            ) : null}

            {assignment.proofUrl ? (
              <Button type="button" size="sm" variant="neutral" asChild>
                <a href={assignment.proofUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3" />
                  View proof
                </a>
              </Button>
            ) : null}

            {canEditTask && permissions.canUpdate ? (
              <Button
                type="button"
                size="sm"
                variant="neutral"
                onClick={() => openEditDialog(assignment)}
                disabled={isPending}
              >
                <Pencil className="size-3" />
                Edit
              </Button>
            ) : null}

            {canEditTask && permissions.canDelete ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="size-3" />
                Delete
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <TaskProofDialog
        assignment={assignment}
        open={proofOpen}
        onOpenChange={setProofOpen}
      />
      <ReportBlockerDialog
        assignment={assignment}
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
      />
      <TaskRevisionDialog
        assignment={assignment}
        open={revisionOpen}
        onOpenChange={setRevisionOpen}
      />
      <TaskStatusChangeDialog
        assignment={assignment}
        toStatus="DONE"
        open={doneDialogOpen}
        onOpenChange={setDoneDialogOpen}
      />
    </>
  )
}
