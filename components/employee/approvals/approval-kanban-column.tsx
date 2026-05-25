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
import type { EmployeeApprovalKanbanColumnId } from "@/lib/approvals/approval-kanban"
import { getEmployeeKanbanStageConfig } from "@/lib/approvals/approval-kanban-status"
import { cn } from "@/lib/utils"

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

  return (
    <div className={cn(KANBAN_COLUMN_WIDTH_CLASS, "self-start")}>
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
          <div
            className={cn(
              KANBAN_COLUMN_LIST_CLASS,
              count === 0 && "items-center justify-center"
            )}
          >
            {count === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                No submissions here.
              </p>
            ) : (
              children
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
