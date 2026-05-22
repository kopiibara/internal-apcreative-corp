"use client"

import { useMemo, useState } from "react"

import { TaskAssignmentCard } from "@/components/to-do/task-assignment-card"
import { TaskKanbanColumn } from "@/components/to-do/task-kanban-column"
import { TaskStatusChangeDialog } from "@/components/to-do/task-status-change-dialog"
import {
  Kanban,
  KanbanBoard,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from "@/components/reui/kanban"
import type { TaskPermissionFlags } from "@/components/to-do/types"
import {
  KANBAN_BOARD_FIT_ROW_CLASS,
  KANBAN_OVERLAY_CLASS,
} from "@/components/shared/kanban-board-scroll"
import { filterTaskAssignments } from "@/lib/task-filters"
import { TASK_KANBAN_COLUMNS } from "@/lib/task-type"
import type { TaskAssignmentStatus } from "@/lib/task-statuses"
import type { TaskAssignmentRecord } from "@/lib/tasks"
import { useTaskStore } from "@/stores/use-task-store"
import { cn } from "@/lib/utils"

type TaskKanbanBoardProps = {
  assignments: TaskAssignmentRecord[]
  currentProfileId: number
  permissions: TaskPermissionFlags
  showAssigneeOnCards?: boolean
  enableDrag?: boolean
  onOpenDetails?: (assignment: TaskAssignmentRecord) => void
  onAssignmentUpdated?: (assignment: TaskAssignmentRecord) => void
}

const TASK_BOARD_ROW_CLASS = cn(KANBAN_BOARD_FIT_ROW_CLASS, "px-6 pb-1")

function renderTaskColumns({
  columns,
  canDragCards,
  permissions,
  currentProfileId,
  showAssigneeOnCards,
  onOpenDetails,
}: {
  columns: Record<string, TaskAssignmentRecord[]>
  canDragCards: boolean
  permissions: TaskPermissionFlags
  currentProfileId: number
  showAssigneeOnCards: boolean
  onOpenDetails?: (assignment: TaskAssignmentRecord) => void
}) {
  return TASK_KANBAN_COLUMNS.map((column) => (
    <TaskKanbanColumn
      key={column.id}
      id={column.id}
      title={column.title}
      count={columns[column.id]?.length ?? 0}
      enableDrag={canDragCards}
    >
      {(columns[column.id] ?? []).map((assignment) => {
        const card = (
          <TaskAssignmentCard
            key={assignment.assignmentId}
            assignment={assignment}
            permissions={permissions}
            currentProfileId={currentProfileId}
            showAssignee={showAssigneeOnCards}
            onOpenDetails={onOpenDetails}
          />
        )

        return canDragCards ? (
          <KanbanItem
            key={assignment.assignmentId}
            value={String(assignment.assignmentId)}
          >
            <KanbanItemHandle>{card}</KanbanItemHandle>
          </KanbanItem>
        ) : (
          card
        )
      })}
    </TaskKanbanColumn>
  ))
}

export function TaskKanbanBoard({
  assignments,
  currentProfileId,
  permissions,
  showAssigneeOnCards = true,
  enableDrag = false,
  onOpenDetails,
  onAssignmentUpdated,
}: TaskKanbanBoardProps) {
  const [pendingMove, setPendingMove] = useState<{
    assignment: TaskAssignmentRecord
    toStatus: TaskAssignmentStatus
  } | null>(null)
  const {
    searchQuery,
    selectedStatusFilter,
    selectedTypeFilter,
    selectedAssigneeFilter,
    selectedPriorityFilter,
  } = useTaskStore()

  const filteredAssignments = useMemo(
    () =>
      filterTaskAssignments({
        assignments,
        searchQuery,
        statusFilter: selectedStatusFilter,
        typeFilter: selectedTypeFilter,
        assigneeFilter: selectedAssigneeFilter,
        priorityFilter: selectedPriorityFilter,
      }),
    [
      assignments,
      searchQuery,
      selectedAssigneeFilter,
      selectedPriorityFilter,
      selectedStatusFilter,
      selectedTypeFilter,
    ]
  )

  const columns = useMemo(() => {
    return TASK_KANBAN_COLUMNS.reduce<
      Record<string, TaskAssignmentRecord[]>
    >((result, column) => {
      result[column.id] = filteredAssignments.filter(
        (assignment) => assignment.status === column.id
      )
      return result
    }, {})
  }, [filteredAssignments])

  const canDragCards =
    enableDrag && (permissions.canReview || permissions.canManageAll)

  function handleMove({ activeContainer, overContainer, activeIndex }: KanbanMoveEvent) {
    if (!canDragCards || activeContainer === overContainer) {
      return
    }

    const assignment = columns[activeContainer]?.[activeIndex]

    if (!assignment) {
      return
    }

    setPendingMove({
      assignment,
      toStatus: overContainer as TaskAssignmentStatus,
    })
  }

  const columnNodes = renderTaskColumns({
    columns,
    canDragCards,
    permissions,
    currentProfileId,
    showAssigneeOnCards,
    onOpenDetails,
  })

  return (
    <>
      {canDragCards ? (
        <Kanban
          value={columns}
          onValueChange={() => undefined}
          getItemValue={(assignment) => String(assignment.assignmentId)}
          onMove={handleMove}
        >
          <KanbanBoard className={TASK_BOARD_ROW_CLASS}>{columnNodes}</KanbanBoard>
          <KanbanOverlay className={KANBAN_OVERLAY_CLASS} />
        </Kanban>
      ) : (
        <div className={TASK_BOARD_ROW_CLASS}>{columnNodes}</div>
      )}

      <TaskStatusChangeDialog
        key={`${pendingMove?.assignment.assignmentId ?? "none"}-${pendingMove?.toStatus ?? "none"}`}
        assignment={pendingMove?.assignment ?? null}
        toStatus={pendingMove?.toStatus ?? null}
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMove(null)
          }
        }}
        onAssignmentUpdated={(updatedAssignment) => {
          onAssignmentUpdated?.(updatedAssignment)
          setPendingMove(null)
        }}
      />
    </>
  )
}
