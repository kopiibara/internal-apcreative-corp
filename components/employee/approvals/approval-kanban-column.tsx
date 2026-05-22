import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import { KANBAN_COLUMN_WIDTH_CLASS } from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import type { EmployeeApprovalKanbanColumnId } from "@/lib/approval-kanban"
import { getEmployeeKanbanStageConfig } from "@/lib/approval-kanban-status"
import { cn } from "@/lib/utils"

const KANBAN_COLUMN_CARD_CLASS =
  "flex w-full flex-col gap-0 overflow-hidden rounded-md py-0 shadow-none"

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
        <div className="p-4 ">
          <div
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-dashed p-4",
              count === 0 && "min-h-[100px] items-center justify-center"
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
        </div>
      </Card>
    </div>
  )
}
