import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import {
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_WIDTH_CLASS,
  KanbanColumnScrollArea,
  kanbanColumnListClass,
} from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import type { EmployeeApprovalKanbanColumnId } from "@/lib/approvals/approval-kanban"
import { getEmployeeKanbanStageConfig } from "@/lib/approvals/approval-kanban-status"

type EmployeeApprovalKanbanColumnProps = {
  id: EmployeeApprovalKanbanColumnId
  title: string
  count: number
  children: React.ReactNode
}

export function EmployeeApprovalKanbanColumn({
  id,
  title,
  count,
  children,
}: EmployeeApprovalKanbanColumnProps) {
  const config = getEmployeeKanbanStageConfig(id)
  const listClassName = kanbanColumnListClass(count)
  const isEmpty = count === 0

  return (
    <div className={KANBAN_COLUMN_WIDTH_CLASS}>
      <Card className={KANBAN_COLUMN_CARD_CLASS}>
        <KanbanColumnHeader
          title={title}
          count={count}
          countClassName={config.badgeClassName}
        />
        <KanbanColumnScrollArea>
          <div className={listClassName}>
            {isEmpty ? (
              <p className="text-center text-xs text-muted-foreground">
                No submissions here.
              </p>
            ) : (
              children
            )}
          </div>
        </KanbanColumnScrollArea>
      </Card>
    </div>
  )
}
