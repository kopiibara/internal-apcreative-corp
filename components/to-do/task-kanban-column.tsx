import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import {
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_FIT_CLASS,
  KanbanColumnScrollArea,
  kanbanColumnListClass,
} from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { getTaskKanbanStageConfig } from "@/lib/tasks/task-kanban-status"
import type { TaskAssignmentStatus } from "@/lib/tasks/task-type"
import { cn } from "@/lib/utils"

type TaskKanbanColumnProps = {
  id: TaskAssignmentStatus
  title: string
  count: number
  enableDrag?: boolean
  className?: string
  children: React.ReactNode
}

const EMPTY_COLUMN_MESSAGES: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: "No assigned tasks.",
  BLOCKER: "No blocker tasks.",
  PENDING: "No pending tasks.",
  REVISION: "No revision tasks.",
  REJECTED: "No rejected tasks.",
  DONE: "No completed tasks.",
}

export function TaskKanbanColumn({
  id,
  title,
  count,
  enableDrag = false,
  className,
  children,
}: TaskKanbanColumnProps) {
  const config = getTaskKanbanStageConfig(id)
  const listClassName = kanbanColumnListClass(count)
  const isEmpty = count === 0

  const listBody = isEmpty ? (
    <p className="text-center text-xs text-muted-foreground">
      {EMPTY_COLUMN_MESSAGES[id]}
    </p>
  ) : (
    children
  )

  const content = (
    <Card className={KANBAN_COLUMN_CARD_CLASS}>
      <KanbanColumnHeader
        title={title}
        count={count}
        countClassName={config.badgeClassName}
      />
      <KanbanColumnScrollArea>
        {enableDrag ? (
          <KanbanColumnContent value={id} className={listClassName}>
            {listBody}
          </KanbanColumnContent>
        ) : (
          <div className={listClassName}>{listBody}</div>
        )}
      </KanbanColumnScrollArea>
    </Card>
  )

  if (enableDrag) {
    return (
      <KanbanColumn value={id} className={cn(KANBAN_COLUMN_FIT_CLASS, className)}>
        {content}
      </KanbanColumn>
    )
  }

  return <div className={cn(KANBAN_COLUMN_FIT_CLASS, className)}>{content}</div>
}
