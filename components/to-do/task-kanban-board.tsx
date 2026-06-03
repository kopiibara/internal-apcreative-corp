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
  KanbanBoardShell,
  KANBAN_BOARD_SCROLL_ROW_CLASS,
  KANBAN_COLUMN_ITEM_CLASS,
  KANBAN_OVERLAY_CLASS,
} from "@/components/shared/kanban-board-scroll"
import { filterTaskAssignments } from "@/lib/tasks/task-filters"
import { canReviewTaskAssignment } from "@/lib/tasks/task-review-guards"
import { TASK_KANBAN_COLUMNS } from "@/lib/tasks/task-type"
import type { TaskAssignmentStatus } from "@/lib/tasks/task-statuses"
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks"
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

const TASK_BOARD_ROW_CLASS = cn(KANBAN_BOARD_SCROLL_ROW_CLASS, "px-3 pb-1 sm:px-6")
const TASK_COLUMN_CLASS =
  "w-[300px] min-w-[300px] max-w-[300px] sm:w-[320px] sm:min-w-[320px] sm:max-w-[320px] lg:w-[340px] lg:min-w-[340px] lg:max-w-[340px] xl:w-[340px] xl:min-w-[340px] xl:max-w-[340px] xl:shrink-0"

function getTaskColumnSortTime(assignment: TaskAssignmentRecord) {
  const value =
    assignment.status === "DONE"
      ? assignment.updatedAt ?? assignment.completedAt ?? assignment.reviewedAt
      : assignment.status === "PENDING"
        ? assignment.updatedAt ?? assignment.submittedAt
        : assignment.status === "BLOCKER"
          ? assignment.blockerReportedAt ?? assignment.updatedAt
          : assignment.status === "REVISION"
            ? assignment.updatedAt ?? assignment.reviewedAt
            : assignment.status === "REJECTED"
              ? assignment.updatedAt ?? assignment.reviewedAt
              : assignment.createdAt ?? assignment.updatedAt

  return new Date(value).getTime()
}

function sortTaskAssignmentsNewestFirst(
  assignments: TaskAssignmentRecord[],
) {
  return [...assignments].sort((left, right) => {
    const timeDifference =
      getTaskColumnSortTime(right) - getTaskColumnSortTime(left)

    if (timeDifference !== 0) {
      return timeDifference
    }

    return right.assignmentId - left.assignmentId
  })
}

function canDragTaskAssignment(
  assignment: TaskAssignmentRecord,
  currentProfileId: number,
  permissions: TaskPermissionFlags,
  enableDrag: boolean,
) {
  if (!enableDrag) {
    return false
  }

  return canReviewTaskAssignment({
    assignment,
    actorProfileId: currentProfileId,
    permissions,
  })
}

function renderTaskColumns({
  columns,
  enableDragBoard,
  permissions,
  currentProfileId,
  showAssigneeOnCards,
  onOpenDetails,
}: {
  columns: Record<string, TaskAssignmentRecord[]>
  enableDragBoard: boolean
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
      enableDrag={enableDragBoard}
      className={TASK_COLUMN_CLASS}
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
        const canDragCard = canDragTaskAssignment(
          assignment,
          currentProfileId,
          permissions,
          enableDragBoard,
        )

        return canDragCard ? (
          <KanbanItem
            key={assignment.assignmentId}
            value={String(assignment.assignmentId)}
            className={KANBAN_COLUMN_ITEM_CLASS}
          >
            <KanbanItemHandle className={KANBAN_COLUMN_ITEM_CLASS}>
              {card}
            </KanbanItemHandle>
          </KanbanItem>
        ) : (
          <div key={assignment.assignmentId} className={KANBAN_COLUMN_ITEM_CLASS}>
            {card}
          </div>
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
      result[column.id] = sortTaskAssignmentsNewestFirst(
        filteredAssignments.filter(
          (assignment) => assignment.status === column.id
        )
      )
      return result
    }, {})
  }, [filteredAssignments])

  const canDragCards =
    enableDrag && (permissions.canReview || permissions.canManageAll)
  const hasDraggableCards = useMemo(
    () =>
      filteredAssignments.some((assignment) =>
        canDragTaskAssignment(
          assignment,
          currentProfileId,
          permissions,
          canDragCards,
        ),
      ),
    [canDragCards, currentProfileId, filteredAssignments, permissions],
  )

  function handleMove({ activeContainer, overContainer, activeIndex }: KanbanMoveEvent) {
    if (!canDragCards || activeContainer === overContainer) {
      return
    }

    const assignment = columns[activeContainer]?.[activeIndex]

    if (
      !assignment ||
      !canDragTaskAssignment(
        assignment,
        currentProfileId,
        permissions,
        canDragCards,
      )
    ) {
      return
    }

    setPendingMove({
      assignment,
      toStatus: overContainer as TaskAssignmentStatus,
    })
  }

  const columnNodes = renderTaskColumns({
    columns,
    enableDragBoard: canDragCards && hasDraggableCards,
    permissions,
    currentProfileId,
    showAssigneeOnCards,
    onOpenDetails,
  })

  return (
    <>
      {canDragCards && hasDraggableCards ? (
        <KanbanBoardShell columnLayout="scroll">
          <Kanban
            className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
            value={columns}
            onValueChange={() => undefined}
            getItemValue={(assignment) => String(assignment.assignmentId)}
            onMove={handleMove}
          >
            <KanbanBoard className={cn(TASK_BOARD_ROW_CLASS, "min-h-0 flex-1")}>
              {columnNodes}
            </KanbanBoard>
            <KanbanOverlay className={KANBAN_OVERLAY_CLASS} />
          </Kanban>
        </KanbanBoardShell>
      ) : (
        <KanbanBoardShell columnLayout="scroll">
          <div className={cn(TASK_BOARD_ROW_CLASS, "min-h-20 flex-1")}>
            {columnNodes}
          </div>
        </KanbanBoardShell>
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
