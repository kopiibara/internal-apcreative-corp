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
import type { TaskPermissionFlags } from "@/components/to-do/types"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    title: "To-Do Task",
    description:
      "Assign work, collect proof, and review completion in a Kanban workflow.",
    createLabel: "Add Task",
  },
  employee: {
    title: "To-Do Task",
    description:
      "Track assigned tasks, submit proof, and monitor review status.",
    cardTitle: "My tasks",
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
  const copy = COPY[variant]
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
    assignmentPatches,
    openCreateDialog,
    closeCreateDialog,
    closeEditDialog,
    openEditDialog,
    updateTaskAssignmentInStore,
  } = useTaskStore()

  const currentAssignments = useMemo(
    () =>
      assignments.map(
        (assignment) =>
          assignmentPatches[assignment.assignmentId] ?? assignment
      ),
    [assignments, assignmentPatches]
  )

  const hasNoTasks = currentAssignments.length === 0

  const resolvedDetailsAssignment = detailsAssignment
    ? assignmentPatches[detailsAssignment.assignmentId] ?? detailsAssignment
    : null

  useTaskBoardSync({
    assignments,
    enablePolling: isEmployeeView,
  })

  const emptyMessage = isEmployeeView
    ? canAssignTeamTasks
      ? "No team tasks yet. Assign work to Multimedia or Content Creator teammates on your shared brands."
      : "No tasks assigned yet. Use Reminders for personal follow-ups."
    : "No tasks yet. Add a task to assign work and start the review workflow."

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>

        {hasNoTasks ? (
          <p className="shrink-0 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : null}

        {showCreateButton ? (
          <Button className="shrink-0" onClick={openCreateDialog}>
            <Plus className="size-4" />
            {createLabel}
          </Button>
        ) : null}
      </div>

      <BoardSection className="w-full min-w-0 overflow-hidden py-4 gap-2 ">
        <CardHeader className="min-w-0 shrink-0 gap-3">
          <TaskFilters
            assignees={assignees}
            showAssigneeFilter={!isEmployeeView}
          />
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden px-0 pb-0">
          <TaskKanbanBoard
            assignments={currentAssignments}
            currentProfileId={currentProfileId}
            permissions={permissions}
            showAssigneeOnCards={!isEmployeeView}
            enableDrag={!isEmployeeView}
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
