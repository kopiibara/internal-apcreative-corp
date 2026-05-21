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
import { ScrollArea } from "@/components/ui/scroll-area"
import { filterTaskAssignments } from "@/lib/task-filters"
import { TASK_KANBAN_COLUMNS } from "@/lib/task-type"
import type { TaskAssignmentStatus } from "@/lib/task-statuses"
import type { TaskAssignmentRecord } from "@/lib/tasks"
import { useTaskStore } from "@/stores/use-task-store"

type TaskKanbanBoardProps = {
  assignments: TaskAssignmentRecord[]
  currentProfileId: number
  permissions: TaskPermissionFlags
  showAssigneeOnCards?: boolean
  enableDrag?: boolean
  onOpenDetails?: (assignment: TaskAssignmentRecord) => void
}

export function TaskKanbanBoard({
  assignments,
  currentProfileId,
  permissions,
  showAssigneeOnCards = true,
  enableDrag = false,
  onOpenDetails,
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

  const boardColumns = (
    <div className="flex h-full min-w-max gap-4 p-1">
      {TASK_KANBAN_COLUMNS.map((column) => (
        <TaskKanbanColumn
          key={column.id}
          id={column.id}
          title={column.title}
          description={column.description}
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
      ))}
    </div>
  )

  return (
    <>
      <ScrollArea
        className="h-full min-h-0 w-full min-w-0 flex-1 pb-3"
        scrollbars="horizontal"
      >
        {canDragCards ? (
          <Kanban
            value={columns}
            onValueChange={() => undefined}
            getItemValue={(assignment) => String(assignment.assignmentId)}
            onMove={handleMove}
          >
            <KanbanBoard className="flex h-full min-w-max gap-4 p-1">
              {TASK_KANBAN_COLUMNS.map((column) => (
                <TaskKanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  description={column.description}
                  count={columns[column.id]?.length ?? 0}
                  enableDrag
                >
                  {(columns[column.id] ?? []).map((assignment) => (
                    <KanbanItem
                      key={assignment.assignmentId}
                      value={String(assignment.assignmentId)}
                    >
                      <KanbanItemHandle>
                        <TaskAssignmentCard
                          assignment={assignment}
                          permissions={permissions}
                          currentProfileId={currentProfileId}
                          showAssignee={showAssigneeOnCards}
                          onOpenDetails={onOpenDetails}
                        />
                      </KanbanItemHandle>
                    </KanbanItem>
                  ))}
                </TaskKanbanColumn>
              ))}
            </KanbanBoard>
            <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/20" />
          </Kanban>
        ) : (
          boardColumns
        )}
      </ScrollArea>

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
      />
    </>
  )
}
