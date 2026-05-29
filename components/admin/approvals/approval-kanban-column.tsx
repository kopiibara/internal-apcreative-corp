import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import {
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_WIDTH_CLASS,
  KanbanColumnScrollArea,
  kanbanColumnListClass,
} from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { getKanbanStageConfig } from "@/lib/approvals/approval-kanban-status"
import type { ApprovalKanbanColumnId } from "@/lib/approvals/approval-statuses"

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
  const listClassName = kanbanColumnListClass(count)
  const isEmpty = count === 0

  return (
    <KanbanColumn value={id} className={KANBAN_COLUMN_WIDTH_CLASS}>
      <Card className={KANBAN_COLUMN_CARD_CLASS}>
        <KanbanColumnHeader
          title={title}
          count={count}
          countClassName={config.badgeClassName}
        />
        <KanbanColumnScrollArea>
          <KanbanColumnContent value={id} className={listClassName}>
            {isEmpty ? (
              <p className="text-center text-xs text-muted-foreground">
                No approvals here.
              </p>
            ) : (
              children
            )}
          </KanbanColumnContent>
        </KanbanColumnScrollArea>
      </Card>
    </KanbanColumn>
  )
}
