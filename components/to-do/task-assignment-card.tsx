"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Pencil, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { deleteTask } from "@/app/admin/to-do/actions"
import { ReportBlockerDialog } from "@/components/to-do/report-blocker-dialog"
import { TaskAssigneeBrands } from "@/components/to-do/task-assignee-brands"
import { TaskProofDialog } from "@/components/to-do/task-proof-dialog"
import { TaskRejectDialog } from "@/components/to-do/task-reject-dialog"
import { TaskRevisionDialog } from "@/components/to-do/task-revision-dialog"
import { TaskStatusChangeDialog } from "@/components/to-do/task-status-change-dialog"
import { TaskProofViewDialog } from "@/components/shared/task-proof-view-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { TaskStatusBadge } from "@/components/to-do/task-status-badge"
import { TaskTypeBadge } from "@/components/to-do/task-type-badge"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RichTextPreview } from "@/components/ui/rich-text-renderer"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import { canReviewTaskAssignment } from "@/lib/tasks/task-review-guards"
import { shouldOpenProofInDialog } from "@/lib/proof/proof-media"
import { getTaskLateSubmissionDisplay } from "@/lib/tasks/task-late-submission"
import { isAssignmentSubmittedOnTime } from "@/lib/tasks/task-type"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"
import { cn } from "@/lib/utils"
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
  const [rejectOpen, setRejectOpen] = useState(false)
  const [doneDialogOpen, setDoneDialogOpen] = useState(false)
  const [proofViewOpen, setProofViewOpen] = useState(false)
  const [nowMs, setNowMs] = useState<number | null>(null)
  const openProofInDialog = shouldOpenProofInDialog(
    assignment.proofType,
    assignment.proofUrl,
  )
  const openEditDialog = useTaskStore((state) => state.openEditDialog)

  const onTimeStatus = isAssignmentSubmittedOnTime(
    assignment.submittedAt,
    assignment.dueDate,
  )
  const lateSubmissionDisplay =
    assignment.taskType === "GRADED"
      ? getTaskLateSubmissionDisplay({
        taskType: assignment.taskType,
        status: assignment.status,
        dueDate: assignment.dueDate,
        submittedAt: assignment.submittedAt,
      })
      : null
  const isAssignee = assignment.assignedToProfileId === currentProfileId
  const canEditTask =
    assignment.status !== "DONE" &&
    (permissions.canManageAll ||
      assignment.createdByProfileId === currentProfileId)
  const canDeleteTask = canEditTask && permissions.canDelete
  const canUpdateTask = canEditTask && permissions.canUpdate
  const canReviewTask = canReviewTaskAssignment({
    assignment,
    actorProfileId: currentProfileId,
    permissions,
  })
  const hasProof =
    Boolean(assignment.proofUrl) || Boolean(assignment.proofNote)
  const hasBlocker = Boolean(assignment.blockerNote)
  const isOverdue =
    assignment.taskType === "GRADED" &&
    Boolean(assignment.dueDate) &&
    !assignment.submittedAt &&
    ["ASSIGNED", "REVISION", "BLOCKER"].includes(assignment.status) &&
    nowMs !== null &&
    new Date(assignment.dueDate as string).getTime() < nowMs

  useEffect(() => {
    setNowMs(Date.now())
  }, [])

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
        className="box-border w-full min-w-0 max-w-full gap-0 cursor-pointer overflow-hidden rounded-lg  px-0 py-2 transition-all hover:-translate-y-0.5 hover:bg-muted bg-white dark:bg-gray-900"
        onClick={() => onOpenDetails?.(assignment)}
      >
        <CardContent className="min-w-0 space-y-2.5 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="w-full flex justify-between">
              <h1 className="line-clamp-1 min-w-0 max-w-36 truncate font-bold leading-snug">
                {assignment.title}
              </h1>
              <span
                className="text-xs text-muted-foreground flex flex-row gap-1 items-center "
                title={dateFormatter.format(new Date(assignment.createdAt))}
              >
                {formatRecentOrDateTime(assignment.createdAt, dateFormatter)}
              </span>
            </div>
            <div className="flex flex-row gap-1 items-center ">
              {assignment.priority ? (
                <StatusBadge
                  status={assignment.priority}
                  type="priority"
                  size="sm"
                  className="h-fit"
                  prefix="Priority"
                />
              ) : null}

              {hasProof ? (
                <StatusBadge status="SUBMITTED" type="proof" size="sm" className="h-fit" />
              ) : null}

              {hasBlocker ? (
                <StatusBadge status="BLOCKER" type="task" size="sm" className="h-fit">
                  Blocker reported
                </StatusBadge>
              ) : null}

              {assignment.status === "DONE" && onTimeStatus !== null ? (
                <StatusBadge
                  status={onTimeStatus ? "ON_TIME" : "LATE"}
                  type="proof"
                  size="sm"
                />
              ) : null}

            </div>

            <div className="flex min-w-0 flex-wrap gap-1">
              <TaskTypeBadge taskType={assignment.taskType} />
              <TaskStatusBadge status={assignment.status} />
              <TaskAssigneeBrands brands={assignment.assigneeBrands} />
            </div>
          </div>

          <div className="flex flex-col border rounded-lg border-border bg-muted px-3 py-2 text-xs font-medium leading-snug">
            {!showAssignee ? (
              <p className="text-xs">
                <span className="text-muted-foreground">Assigned to:</span>{" "}
                <span className="font-medium">{assignment.assignedToName}</span>
              </p>
            ) : null}
            <p className="text-xs">
              <span className="text-muted-foreground">Created by:</span>{" "}
              <span className="font-medium"> {assignment.createdByName}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Due:</span>{" "}
              <span
                className={cn(
                  "font-bold",
                  isOverdue && "text-destructive"
                )}
              >
                {assignment.dueDate
                  ? formatRecentOrDateTime(assignment.dueDate, dateFormatter)
                  : "—"}
              </span>
            </div>
          </div>


          {lateSubmissionDisplay ? (
            <div className="rounded-lg border-2 border-border bg-muted/40 px-2.5 py-2 text-xs font-semibold leading-snug">
              {lateSubmissionDisplay.summaryLabel}
            </div>
          ) : null}

          <div
            className="grid w-full min-w-0 grid-cols-2 gap-1.5  [&_button]:h-8 [&_button]:min-w-0 [&_button]:px-2 [&_button]:text-[11px] [&_svg]:size-3"
            onClick={(event) => event.stopPropagation()}
          >
            {isAssignee &&
              permissions.canSubmitProof &&
              ["ASSIGNED", "REVISION"].includes(assignment.status) ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setProofOpen(true)}
                disabled={isPending}
              >
                {assignment.status === "REVISION" ? "Resubmit" : "Proof"}
              </Button>
            ) : null}

            {isAssignee &&
              permissions.canReportBlocker &&
              ["ASSIGNED", "REVISION"].includes(assignment.status) ? (
              <Button
                type="button"
                size="sm"
                variant="neutral"
                onClick={() => setBlockerOpen(true)}
                disabled={isPending}
              >
                Blocker
              </Button>
            ) : null}

            {canReviewTask && assignment.status === "PENDING" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDoneDialogOpen(true)}
                  disabled={isPending}
                >
                  Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={() => setRevisionOpen(true)}
                  disabled={isPending}
                >
                  Revision
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={isPending}
                >
                  <XCircle className="size-3" />
                  Reject
                </Button>
              </>
            ) : null}

            {assignment.proofUrl ? (
              openProofInDialog ? (
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={(event) => {
                    event.stopPropagation()
                    setProofViewOpen(true)
                  }}
                >
                  <ExternalLink className="size-3" />
                  {assignment.proofType === "IMAGE" ? "View image" : "View proof"}
                </Button>
              ) : (
                <Button type="button" size="sm" variant="neutral" className="h-fit py-1" asChild>
                  <a
                    href={assignment.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLink className="size-3" />
                    View
                  </a>
                </Button>
              )
            ) : null}
          </div>

          {showAssignee || canUpdateTask || canDeleteTask ? (
            <div
              className="flex w-full min-w-0 items-center gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              {showAssignee ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <UserAvatar
                    profileId={assignment.assignedToProfileId}
                    name={assignment.assignedToName}
                    imageUrl={assignment.assignedToImageUrl}
                    size="sm"
                  />
                  <p className="min-w-0 truncate text-xs font-medium">
                    {assignment.assignedToName}
                  </p>
                </div>
              ) : null}

              {canUpdateTask || canDeleteTask ? (
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-1.5",
                    !showAssignee && "ml-auto",
                  )}
                >
                  {canUpdateTask ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="neutral"
                      aria-label="Edit task"
                      onClick={() => openEditDialog(assignment)}
                      disabled={isPending}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null}
                  {canDeleteTask ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      aria-label="Delete task"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <TaskProofDialog
        assignment={assignment}
        open={proofOpen}
        onOpenChange={setProofOpen}
      />
      <TaskProofViewDialog
        open={proofViewOpen}
        onOpenChange={setProofViewOpen}
        proofType={assignment.proofType}
        proofUrl={assignment.proofUrl}
        proofNote={assignment.proofNote}
        taskTitle={assignment.title}
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
      <TaskRejectDialog
        assignment={assignment}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
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
