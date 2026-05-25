import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import {
  KANBAN_COLUMN_BODY_CLASS,
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_LIST_CLASS,
  KANBAN_COLUMN_VIEWPORT_CLASS,
  KANBAN_COLUMN_WIDTH_CLASS,
} from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getKanbanStageConfig } from "@/lib/approvals/approval-kanban-status"
import type { ApprovalKanbanColumnId } from "@/lib/approvals/approval-statuses"
import { cn } from "@/lib/utils"

type ApprovalKanbanColumnProps = {
  id: ApprovalKanbanColumnId
  title: string
  count: number
  children: React.ReactNode
}

export function ApprovalKanbanColumn({
  id,
  title,
  count,
  children,
}: ApprovalKanbanColumnProps) {
  const config = getKanbanStageConfig(id)
  const listClassName = cn(
    KANBAN_COLUMN_LIST_CLASS,
    count === 0 && "items-center justify-center"
  )

  return (
    <KanbanColumn value={id} className={cn(KANBAN_COLUMN_WIDTH_CLASS, "self-start")}>
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
          <KanbanColumnContent value={id} className={listClassName}>
            {count === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                No approvals here.
              </p>
            ) : (
              children
            )}
          </KanbanColumnContent>
        </ScrollArea>
      </Card>
    </KanbanColumn>
  )
}
