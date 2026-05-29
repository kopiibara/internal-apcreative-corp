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
import { getStatusBadgeClassName } from "@/lib/ui/status-badge"
import type { ReminderStatus } from "@/lib/reminders/reminder-statuses"

type ReminderKanbanColumnProps = {
  id: ReminderStatus
  title: string
  count: number
  children: React.ReactNode
}

const EMPTY_COLUMN_MESSAGES: Record<ReminderStatus, string> = {
  PENDING: "No reminders.",
  DUE: "No due reminders.",
  DONE: "No completed reminders.",
  ARCHIVED: "No archived reminders.",
}

export function ReminderKanbanColumn({
  id,
  title,
  count,
  children,
}: ReminderKanbanColumnProps) {
  const listClassName = kanbanColumnListClass(count)
  const isEmpty = count === 0

  const listBody = isEmpty ? (
    <p className="text-center text-xs text-muted-foreground">
      {EMPTY_COLUMN_MESSAGES[id]}
    </p>
  ) : (
    children
  )

  return (
    <KanbanColumn value={id} className={KANBAN_COLUMN_FIT_CLASS}>
      <Card className={KANBAN_COLUMN_CARD_CLASS}>
        <KanbanColumnHeader
          title={title}
          count={count}
          countClassName={getStatusBadgeClassName(id, "reminder")}
        />
        <KanbanColumnScrollArea>
          <KanbanColumnContent value={id} className={listClassName}>
            {listBody}
          </KanbanColumnContent>
        </KanbanColumnScrollArea>
      </Card>
    </KanbanColumn>
  )
}
