"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { useTaskBoardSync } from "@/hooks/use-task-board-sync"

import { TaskCreateDialog } from "@/components/to-do/task-create-dialog"
import { TaskDetailsSheet } from "@/components/to-do/task-details-sheet"
import { TaskEditDialog } from "@/components/to-do/task-edit-dialog"
import { TaskFilters } from "@/components/to-do/task-filters"
import { TaskKanbanBoard } from "@/components/to-do/task-kanban-board"
import { BoardSection } from "@/components/shared/board-section"
import {
  KANBAN_BOARD_CONTENT_CLASS,
  KANBAN_BOARD_PAGE_CLASS,
  KANBAN_BOARD_SECTION_CLASS,
} from "@/components/shared/kanban-board-scroll"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import type { AccountType } from "@/lib/auth/account-type"
import type { AssignableProfile, TaskAssignmentRecord } from "@/lib/tasks/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskBoardProps = {
  variant: "admin" | "employee"
  assignments: TaskAssignmentRecord[]
  assignees: AssignableProfile[]
  currentProfileId: number
  currentAccountType: AccountType
  permissions: TaskPermissionFlags
}

const COPY = {
  admin: {
    createLabel: "Add Task",
  },
  employee: {
    createLabel: "Add Personal Task",
    teamCreateLabel: "Assign Task",
  },
} as const

export function TaskBoard({
  variant,
  assignments,
  assignees,
  currentProfileId,
  currentAccountType,
  permissions,
}: TaskBoardProps) {
  const [detailsAssignment, setDetailsAssignment] =
    useState<TaskAssignmentRecord | null>(null)
  const isEmployeeView = variant === "employee"
  const canAssignTeamTasks = isEmployeeView && permissions.canAssign
  const showCreateButton = isEmployeeView
    ? canAssignTeamTasks
    : permissions.canCreate
  const createLabel = isEmployeeView
    ? COPY.employee.teamCreateLabel
    : COPY.admin.createLabel
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    selectedAssignment,
    liveAssignments,
    assignmentPatches,
    openCreateDialog,
    closeCreateDialog,
    closeEditDialog,
    openEditDialog,
    updateTaskAssignmentInStore,
  } = useTaskStore()

  const currentAssignments = useMemo(
    () =>
      (liveAssignments ?? assignments).map(
        (assignment) =>
          assignmentPatches[assignment.assignmentId] ?? assignment
      ),
    [assignments, assignmentPatches, liveAssignments]
  )

  const resolvedDetailsAssignment = detailsAssignment
    ? assignmentPatches[detailsAssignment.assignmentId] ?? detailsAssignment
    : null

  useTaskBoardSync({
    assignments,
    enablePolling: isEmployeeView,
  })

  const hasNoTasks = currentAssignments.length === 0
  const emptyMessage = isEmployeeView
    ? canAssignTeamTasks
      ? "No team tasks yet. Assign work to Multimedia or Content Creator teammates on your shared brands."
      : "No tasks assigned yet. Use Reminders for personal follow-ups."
    : "No tasks yet. Add a task to assign work and start the review workflow."

  return (
    <div className={KANBAN_BOARD_PAGE_CLASS}>
      <BoardSection className={KANBAN_BOARD_SECTION_CLASS}>
        <CardHeader className="min-w-0 shrink-0 gap-0 pb-0">
          {hasNoTasks ? (
            <p className="max-w-2xl rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
          <TaskFilters
            assignees={assignees}
            showAssigneeFilter={!isEmployeeView}
            actions={
              showCreateButton ? (
                <Button className="shrink-0" onClick={openCreateDialog}>
                  <Plus className="size-4" />
                  {createLabel}
                </Button>
              ) : null
            }
          />
        </CardHeader>
        <CardContent className={KANBAN_BOARD_CONTENT_CLASS}>
          <TaskKanbanBoard
            assignments={currentAssignments}
            currentProfileId={currentProfileId}
            permissions={permissions}
            showAssigneeOnCards={!isEmployeeView}
            enableDrag={!isEmployeeView || permissions.canReview}
            onOpenDetails={setDetailsAssignment}
            onAssignmentUpdated={updateTaskAssignmentInStore}
          />
        </CardContent>
      </BoardSection>

      <TaskCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateDialog()
          }
        }}
        assignees={assignees}
        currentProfileId={currentProfileId}
        currentAccountType={currentAccountType}
        permissions={permissions}
        personalOnly={false}
        canAssignTeamTasks={canAssignTeamTasks}
      />

      <TaskEditDialog
        assignment={selectedAssignment}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog()
          }
        }}
      />

      <TaskDetailsSheet
        assignment={resolvedDetailsAssignment}
        open={resolvedDetailsAssignment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsAssignment(null)
          }
        }}
        permissions={permissions}
        currentProfileId={currentProfileId}
        onEditTask={openEditDialog}
      />
    </div>
  )
}
