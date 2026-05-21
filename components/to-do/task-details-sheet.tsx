"use client"

import { useState } from "react"

import { ReportBlockerDialog } from "@/components/to-do/report-blocker-dialog"
import { TaskActivityTimeline } from "@/components/to-do/task-activity-timeline"
import { TaskBlockerSummary } from "@/components/to-do/task-blocker-summary"
import { TaskDetailsSummary } from "@/components/to-do/task-details-summary"
import { TaskProofDialog } from "@/components/to-do/task-proof-dialog"
import { TaskProofSummary } from "@/components/to-do/task-proof-summary"
import { TaskRevisionDialog } from "@/components/to-do/task-revision-dialog"
import { TaskStatusChangeDialog } from "@/components/to-do/task-status-change-dialog"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { TaskAssignmentStatus } from "@/lib/task-statuses"
import type { TaskAssignmentRecord } from "@/lib/tasks"

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
  const [proofOpen, setProofOpen] = useState(false)
  const [blockerOpen, setBlockerOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<TaskAssignmentStatus | null>(null)

  const isAssignee = assignment?.assignedToProfileId === currentProfileId
  const canEditTask =
    Boolean(assignment) &&
    assignment?.status !== "DONE" &&
    permissions.canUpdate &&
    (permissions.canManageAll ||
      assignment?.createdByProfileId === currentProfileId)
  const canSubmitProof =
    Boolean(assignment) &&
    isAssignee &&
    permissions.canSubmitProof &&
    (assignment?.status === "ASSIGNED" || assignment?.status === "REVISION")
  const canReportBlocker = canSubmitProof
  const canReview =
    Boolean(assignment) &&
    permissions.canReview &&
    assignment?.assignedToProfileId !== currentProfileId
  const canConfirmDone = canReview && assignment?.status === "PENDING"
  const canRequestRevision = canReview && assignment?.status === "PENDING"
  const canResolveBlocker = canReview && assignment?.status === "BLOCKER"
  const canChangeStatus =
    Boolean(assignment) &&
    (permissions.canReview || permissions.canManageAll) &&
    assignment?.assignedToProfileId !== currentProfileId

  function openStatusChange(status: TaskAssignmentStatus | null) {
    setNextStatus(status)
    setStatusDialogOpen(true)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="h-svh w-[95vw] sm:w-[50vw]! sm:max-w-[50vw]!">
          <SheetHeader>
            <SheetTitle>Task Details</SheetTitle>
            <SheetDescription>
              Review task proof, blockers, status history, and available actions.
            </SheetDescription>
          </SheetHeader>

          {assignment ? (
            <ScrollArea className="min-h-0 flex-1" scrollbars="vertical">
              <div className="space-y-4 px-6 pb-6">
                <TaskDetailsSummary assignment={assignment} />

                <div className="flex flex-wrap gap-2">
                  {canSubmitProof ? (
                    <Button type="button" onClick={() => setProofOpen(true)}>
                      {assignment.status === "REVISION"
                        ? "Resubmit Proof"
                        : "Submit Proof"}
                    </Button>
                  ) : null}

                  {canReportBlocker ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBlockerOpen(true)}
                    >
                      Report Blocker
                    </Button>
                  ) : null}

                  {canConfirmDone ? (
                    <Button type="button" onClick={() => openStatusChange("DONE")}>
                      Confirm Done
                    </Button>
                  ) : null}

                  {canRequestRevision ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRevisionOpen(true)}
                    >
                      Request Revision
                    </Button>
                  ) : null}

                  {canResolveBlocker ? (
                    <Button
                      type="button"
                      onClick={() => openStatusChange("ASSIGNED")}
                    >
                      Confirm/Resolve Blocker
                    </Button>
                  ) : null}

                  {canChangeStatus ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openStatusChange(null)}
                    >
                      Change Status
                    </Button>
                  ) : null}

                  {canEditTask ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onEditTask(assignment)}
                    >
                      Edit Task Details
                    </Button>
                  ) : null}
                </div>

                <TaskProofSummary assignment={assignment} />
                <TaskBlockerSummary assignment={assignment} />
                <TaskActivityTimeline logs={assignment.activityLogs} />
              </div>
            </ScrollArea>
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
