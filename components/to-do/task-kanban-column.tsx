import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import { KANBAN_COLUMN_FIT_CLASS } from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { getTaskKanbanStageConfig } from "@/lib/task-kanban-status"
import type { TaskAssignmentStatus } from "@/lib/task-type"
import { cn } from "@/lib/utils"

const KANBAN_COLUMN_CARD_CLASS =
  "flex w-full flex-col gap-0 overflow-hidden rounded-md py-0 shadow-none"

const KANBAN_COLUMN_LIST_CLASS =
  "flex flex-col gap-3 rounded-lg border border-dashed p-4"

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
    count === 0 && "min-h-[100px] items-center justify-center"
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
      <div className="p-4">
        {enableDrag ? (
          <KanbanColumnContent value={id} className={listClassName}>
            {listBody}
          </KanbanColumnContent>
        ) : (
          <div className={listClassName}>{listBody}</div>
        )}
      </div>
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
