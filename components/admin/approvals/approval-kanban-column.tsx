"use client"

import type { ReactNode } from "react"

import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import { KANBAN_COLUMN_WIDTH_CLASS } from "@/components/shared/kanban-board-scroll"
import { Card } from "@/components/ui/card"
import { getKanbanStageConfig } from "@/lib/approval-kanban-status"
import type { ApprovalKanbanColumnId } from "@/lib/approval-statuses"
import { cn } from "@/lib/utils"
import type { ContentReport } from "@/types/content-report"

const KANBAN_COLUMN_CARD_CLASS =
  "flex w-full flex-col gap-0 overflow-hidden rounded-md py-0 shadow-none"

export type ApprovalKanbanColumnProps = {
  id: ApprovalKanbanColumnId
  title: string
  description: string
  reports: ContentReport[]
  children: ReactNode
}

export function ApprovalKanbanColumn({
  id,
  title,
  description,
  reports,
  children,
}: ApprovalKanbanColumnProps) {
  const count = reports.length
  const config = getKanbanStageConfig(id)

  return (
    <KanbanColumn
      value={id}
      className={cn(KANBAN_COLUMN_WIDTH_CLASS, "h-auto self-start")}
    >
      <Card className={KANBAN_COLUMN_CARD_CLASS}>
        <KanbanColumnHeader
          title={title}
          description={description}
          count={count}
          countClassName={config.badgeClassName}
        />
        <div className="p-4">
          <KanbanColumnContent
            value={id}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-dashed p-4",
              count === 0 && "min-h-[100px] items-center justify-center"
            )}
          >
            {count === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                No approvals here.
              </p>
            ) : (
              children
            )}
          </KanbanColumnContent>
        </div>
      </Card>
    </KanbanColumn>
  )
}
