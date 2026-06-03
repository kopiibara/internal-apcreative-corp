"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteTask } from "@/app/admin/to-do/actions"

import { ReportBlockerDialog } from "@/components/to-do/report-blocker-dialog"
import { TaskActivityTimeline } from "@/components/to-do/task-activity-timeline"
import { TaskBlockerSummary } from "@/components/to-do/task-blocker-summary"
import { TaskDetailsSummary } from "@/components/to-do/task-details-summary"
import { TaskProofDialog } from "@/components/to-do/task-proof-dialog"
import { TaskProofSummary } from "@/components/to-do/task-proof-summary"
import { TaskRejectDialog } from "@/components/to-do/task-reject-dialog"
import { TaskRevisionDialog } from "@/components/to-do/task-revision-dialog"
import { TaskScoringOverrideDialog } from "@/components/to-do/task-scoring-override-dialog"
import { TaskStatusChangeDialog } from "@/components/to-do/task-status-change-dialog"
import { TaskStatusBadge } from "@/components/to-do/task-status-badge"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  formatAbsoluteDateTime,
  formatRecentOrDateTime,
} from "@/lib/date-time/relative-timestamp"
import type { TaskAssignmentStatus } from "@/lib/tasks/task-statuses"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDate(value: string | null) {
  return value ? formatRecentOrDateTime(value, dateTimeFormatter) : "Not set"
}

function formatDueDate(value: string | null) {
  return value ? formatAbsoluteDateTime(value, dateTimeFormatter) : "Not set"
}

function TaskDetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="items-center border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function TaskAssignmentPanel({
  assignment,
}: {
  assignment: TaskAssignmentRecord
}) {
  return (
    <TaskDetailSection title="Assignment">
      <div className="space-y-4">
        <DetailField label="Created date">
          {formatDate(assignment.createdAt)}
        </DetailField>
        <DetailField label="Assigned date">
          {formatDate(assignment.createdAt)}
        </DetailField>
        <DetailField label="Reviewed by">
          {assignment.reviewedByName ?? "Not reviewed"}
        </DetailField>
        <DetailField label="Reviewed at">
          {formatDate(assignment.reviewedAt)}
        </DetailField>
      </div>
    </TaskDetailSection>
  )
}

function TaskMetadataPanel({
  assignment,
}: {
  assignment: TaskAssignmentRecord
}) {
  return (
    <TaskDetailSection title="Schedule & Task">
      <div className="space-y-4">
        <DetailField label="Due date">{formatDueDate(assignment.dueDate)}</DetailField>
        <DetailField label="Completed date">
          {formatDate(assignment.completedAt)}
        </DetailField>
        <DetailField label="Reviewed date">
          {formatDate(assignment.reviewedAt)}
        </DetailField>
        <DetailField label="Last updated">
          {formatDate(assignment.updatedAt)}
        </DetailField>
      </div>
    </TaskDetailSection>
  )
}

type TaskActionsPanelProps = {
  assignment: TaskAssignmentRecord
  canSubmitProof: boolean
  canReportBlocker: boolean
  canConfirmDone: boolean
  canRequestRevision: boolean
  canRejectTask: boolean
  canResolveBlocker: boolean
  canChangeStatus: boolean
  canAdjustScoring: boolean
  canEditTask: boolean
  canDeleteTask: boolean
  isDeletePending: boolean
  onSubmitProof: () => void
  onReportBlocker: () => void
  onConfirmDone: () => void
  onRequestRevision: () => void
  onRejectTask: () => void
  onResolveBlocker: () => void
  onChangeStatus: () => void
  onAdjustScoring: () => void
  onEditTask: () => void
  onDeleteTask: () => void
}

function TaskActionsFooter({
  assignment,
  canSubmitProof,
  canReportBlocker,
  canConfirmDone,
  canRequestRevision,
  canRejectTask,
  canResolveBlocker,
  canChangeStatus,
  canAdjustScoring,
  canEditTask,
  canDeleteTask,
  isDeletePending,
  onSubmitProof,
  onReportBlocker,
  onConfirmDone,
  onRequestRevision,
  onRejectTask,
  onResolveBlocker,
  onChangeStatus,
  onAdjustScoring,
  onEditTask,
  onDeleteTask,
}: TaskActionsPanelProps) {
  const hasActions =
    canSubmitProof ||
    canReportBlocker ||
    canConfirmDone ||
    canRequestRevision ||
    canRejectTask ||
    canResolveBlocker ||
    canChangeStatus ||
    canAdjustScoring ||
    canEditTask ||
    canDeleteTask

  if (!hasActions) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canSubmitProof ? (
        <Button type="button" size="sm" onClick={onSubmitProof}>
          {assignment.status === "REVISION" ? "Resubmit Proof" : "Submit Proof"}
        </Button>
      ) : null}
      {canReportBlocker ? (
        <Button
          type="button"
          size="sm"
          variant="neutral"
          onClick={onReportBlocker}
        >
          Report Blocker
        </Button>
      ) : null}
      {canConfirmDone ? (
        <Button type="button" size="sm" onClick={onConfirmDone}>
          Confirm Done
        </Button>
      ) : null}
      {canRequestRevision ? (
        <Button type="button" size="sm" onClick={onRequestRevision}>
          Request Revision
        </Button>
      ) : null}
      {canRejectTask ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onRejectTask}
        >
          Reject Task
        </Button>
      ) : null}
      {canResolveBlocker ? (
        <Button type="button" size="sm" onClick={onResolveBlocker}>
          Confirm/Resolve Blocker
        </Button>
      ) : null}
      {canChangeStatus ? (
        <Button type="button" size="sm" onClick={onChangeStatus}>
          Change Status
        </Button>
      ) : null}
      {canAdjustScoring ? (
        <Button
          type="button"
          size="sm"
          variant="neutral"
          onClick={onAdjustScoring}
        >
          Adjust Points
        </Button>
      ) : null}
      {canEditTask ? (
        <Button
          type="button"
          size="sm"
          variant="neutral"
          onClick={onEditTask}
        >
          Edit Task Details
        </Button>
      ) : null}
      {canDeleteTask ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isDeletePending}
          onClick={onDeleteTask}
        >
          <Trash2 className="size-3.5" />
          Delete Task
        </Button>
      ) : null}
    </div>
  )
}

type TaskDetailsSheetProps = {
  assignment: TaskAssignmentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  permissions: TaskPermissionFlags
  currentProfileId: number
  onEditTask: (assignment: TaskAssignmentRecord) => void
}

export function TaskDetailsSheet({
  assignment,
  open,
  onOpenChange,
  permissions,
  currentProfileId,
  onEditTask,
}: TaskDetailsSheetProps) {
  const router = useRouter()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [proofOpen, setProofOpen] = useState(false)
  const [blockerOpen, setBlockerOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [scoringOpen, setScoringOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<TaskAssignmentStatus | null>(null)

  const isAssignee = assignment?.assignedToProfileId === currentProfileId
  const canEditTask =
    Boolean(assignment) &&
    assignment?.status !== "DONE" &&
    permissions.canUpdate &&
    (permissions.canManageAll ||
      assignment?.createdByProfileId === currentProfileId)
  const canDeleteTask =
    Boolean(assignment) &&
    assignment?.status !== "DONE" &&
    (permissions.canManageAll ||
      assignment?.createdByProfileId === currentProfileId) &&
    (permissions.canDelete ||
      assignment?.createdByProfileId === currentProfileId)
  const canSubmitProof =
    Boolean(assignment) &&
    isAssignee &&
    permissions.canSubmitProof &&
    (assignment?.status === "ASSIGNED" || assignment?.status === "REVISION")
  const canReportBlocker = canSubmitProof && permissions.canReportBlocker
  const canReview =
    Boolean(assignment) &&
    permissions.canReview &&
    assignment?.assignedToProfileId !== currentProfileId
  const canConfirmDone = canReview && assignment?.status === "PENDING"
  const canRequestRevision = canReview && assignment?.status === "PENDING"
  const canRejectTask = canReview && assignment?.status === "PENDING"
  const canResolveBlocker = canReview && assignment?.status === "BLOCKER"
  const canChangeStatus =
    Boolean(assignment) &&
    (permissions.canReview || permissions.canManageAll) &&
    assignment?.assignedToProfileId !== currentProfileId
  const canAdjustScoring =
    Boolean(assignment) &&
    assignment?.taskType === "GRADED" &&
    assignment?.status === "DONE" &&
    (permissions.canReview || permissions.canManageAll) &&
    assignment?.assignedToProfileId !== currentProfileId
  const hasSheetActions =
    canSubmitProof ||
    canReportBlocker ||
    canConfirmDone ||
    canRequestRevision ||
    canRejectTask ||
    canResolveBlocker ||
    canChangeStatus ||
    canAdjustScoring ||
    canEditTask ||
    canDeleteTask

  function handleDeleteTask() {
    if (!assignment) {
      return
    }

    startDeleteTransition(async () => {
      const result = await deleteTask({ taskId: assignment.taskId })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  function openStatusChange(status: TaskAssignmentStatus | null) {
    setNextStatus(status)
    setStatusDialogOpen(true)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden  sm:max-w-4xl! sm:w-[50vw]! xl:max-w-6xl!">
          <SheetHeader className="shrink-0 pb-4 px-4 border-b-2 border-border">
            {assignment ? (
              <>
                <SheetTitle className="flex flex-wrap items-center gap-3 font-medium">
                  <span className="text-xl font-bold sm:text-2xl">
                    Task Details
                  </span>
                  <TaskStatusBadge status={assignment.status} />
                </SheetTitle>
                <SheetDescription>
                  Review task proof, blockers, status history, and available actions.
                </SheetDescription>
              </>
            ) : (
              <>
                <SheetTitle>Task Details</SheetTitle>
                <SheetDescription>
                  Review task proof, blockers, status history, and available actions.
                </SheetDescription>
              </>
            )}
          </SheetHeader>

          {assignment ? (
            <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
              <div className="grid min-w-0 grid-cols-1 gap-4 py-4  xl:grid-cols-[2fr_1fr] px-4">
                <div className="min-w-0 space-y-4">
                  <TaskDetailsSummary assignment={assignment} />
                  <TaskProofSummary assignment={assignment} />
                  <TaskActivityTimeline logs={assignment.activityLogs} />
                </div>
                <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
                  <TaskAssignmentPanel assignment={assignment} />
                  <TaskMetadataPanel assignment={assignment} />
                  <TaskBlockerSummary assignment={assignment} />
                </aside>
              </div>
            </ScrollArea>
          ) : null}

          {assignment && hasSheetActions ? (
            <SheetFooter className="sticky bottom-0 z-10 shrink-0 border-t-2 border-border bg-background/95 px-4 py-3 pb-4! backdrop-blur ">
              <TaskActionsFooter
                assignment={assignment}
                canSubmitProof={canSubmitProof}
                canReportBlocker={canReportBlocker}
                canConfirmDone={canConfirmDone}
                canRequestRevision={canRequestRevision}
                canRejectTask={canRejectTask}
                canResolveBlocker={canResolveBlocker}
                canChangeStatus={canChangeStatus}
                canAdjustScoring={canAdjustScoring}
                canEditTask={canEditTask}
                canDeleteTask={canDeleteTask}
                isDeletePending={isDeletePending}
                onSubmitProof={() => setProofOpen(true)}
                onReportBlocker={() => setBlockerOpen(true)}
                onConfirmDone={() => openStatusChange("DONE")}
                onRequestRevision={() => setRevisionOpen(true)}
                onRejectTask={() => setRejectOpen(true)}
                onResolveBlocker={() => openStatusChange("ASSIGNED")}
                onChangeStatus={() => openStatusChange(null)}
                onAdjustScoring={() => setScoringOpen(true)}
                onEditTask={() => onEditTask(assignment)}
                onDeleteTask={handleDeleteTask}
              />
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

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
      <TaskRejectDialog
        assignment={assignment}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
      <TaskScoringOverrideDialog
        assignment={assignment}
        open={scoringOpen}
        onOpenChange={setScoringOpen}
      />
      <TaskStatusChangeDialog
        key={`${assignment?.assignmentId ?? "none"}-${nextStatus ?? "select"}`}
        assignment={assignment}
        toStatus={nextStatus}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />
    </>
  )
}
