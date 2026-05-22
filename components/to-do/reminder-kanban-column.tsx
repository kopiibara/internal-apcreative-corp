import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import { KANBAN_COLUMN_FIT_CLASS } from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { getStatusBadgeClassName } from "@/lib/status-badge"
import type { ReminderStatus } from "@/lib/reminder-statuses"
import { cn } from "@/lib/utils"

const KANBAN_COLUMN_CARD_CLASS =
  "flex w-full flex-col gap-0 overflow-hidden rounded-md py-0 shadow-none"

const KANBAN_COLUMN_LIST_CLASS =
  "flex flex-col gap-3 rounded-lg border border-dashed p-4"

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

  return (
    <KanbanColumn value={id} className={cn(KANBAN_COLUMN_FIT_CLASS, "h-auto")}>
      <Card className={KANBAN_COLUMN_CARD_CLASS}>
        <KanbanColumnHeader
          title={title}
          count={count}
          countClassName={getStatusBadgeClassName(id, "reminder")}
        />
        <div className="p-4">
          <KanbanColumnContent value={id} className={listClassName}>
            {listBody}
          </KanbanColumnContent>
        </div>
      </Card>
    </KanbanColumn>
  )
}
