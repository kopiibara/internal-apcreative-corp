import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import {
  KANBAN_COLUMN_BODY_CLASS,
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_FIT_CLASS,
  KANBAN_COLUMN_LIST_CLASS,
  KANBAN_COLUMN_VIEWPORT_CLASS,
} from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getTaskKanbanStageConfig } from "@/lib/tasks/task-kanban-status"
import type { TaskAssignmentStatus } from "@/lib/tasks/task-type"
import { cn } from "@/lib/utils"

type TaskKanbanColumnProps = {
  id: TaskAssignmentStatus
  title: string
  count: number
  enableDrag?: boolean
  children: React.ReactNode
}

const EMPTY_COLUMN_MESSAGES: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: "No assigned tasks.",
  BLOCKER: "No blocker tasks.",
  PENDING: "No pending tasks.",
  REVISION: "No revision tasks.",
  DONE: "No completed tasks.",
}

export function TaskKanbanColumn({
  id,
  title,
  count,
  enableDrag = false,
  children,
}: TaskKanbanColumnProps) {
  const config = getTaskKanbanStageConfig(id)
  const listClassName = cn(
    KANBAN_COLUMN_LIST_CLASS,
    count === 0 && "items-center justify-center"
  )

  const listBody =
    count === 0 ? (
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
      <ScrollArea
        className={KANBAN_COLUMN_BODY_CLASS}
        viewportClassName={KANBAN_COLUMN_VIEWPORT_CLASS}
        scrollbars="vertical"
      >
        {enableDrag ? (
          <KanbanColumnContent value={id} className={listClassName}>
            {listBody}
          </KanbanColumnContent>
        ) : (
          <div className={listClassName}>{listBody}</div>
        )}
      </ScrollArea>
    </Card>
  )

  if (enableDrag) {
    return (
      <KanbanColumn value={id} className={cn(KANBAN_COLUMN_FIT_CLASS, "h-auto")}>
        {content}
      </KanbanColumn>
    )
  }

  return <div className={KANBAN_COLUMN_FIT_CLASS}>{content}</div>
}
