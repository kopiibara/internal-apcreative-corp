"use client"

import {
  BadgeCheck,
  CalendarClock,
  CheckCheck,
  CheckCircle,
  Clock,
  RotateCcw,
  XCircle,
} from "lucide-react"

import {
  KanbanColumn,
  KanbanColumnContent,
} from "@/components/reui/kanban"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getKanbanStageConfig } from "@/lib/approvals/approval-kanban-status"
import type { ApprovalKanbanColumnId } from "@/lib/approvals/approval-statuses"
import { cn } from "@/lib/utils"
import type { ContentReport } from "@/types/content-report"

type ApprovalKanbanColumnProps = {
  id: ApprovalKanbanColumnId
  title: string
  description?: string
  reports: ContentReport[]
  children: React.ReactNode
}

const stageIcons = {
  Clock,
  CheckCircle,
  BadgeCheck,
  RotateCcw,
  XCircle,
  CalendarClock,
  CheckCheck,
}

export function ApprovalKanbanColumn({
  id,
  title,
  description,
  reports,
  children,
}: ApprovalKanbanColumnProps) {
  const config = getKanbanStageConfig(id)
  const Icon = stageIcons[config.icon as keyof typeof stageIcons]

  return (
    <KanbanColumn value={id} className="h-full min-w-[290px]">
      <Card className="flex h-full w-80 flex-col rounded-md py-2 px-1">
        <CardHeader className="shrink-0 space-y-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border",
                  config.toneClassName
                )}
              >
                <Icon className="size-4" />
              </span>
              <CardTitle className="truncate text-sm">{title}</CardTitle>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0", config.badgeClassName)}
            >
              {reports.length}
            </Badge>
          </div>
          {description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-4 py-2 ">
          <ScrollArea
            className="min-h-0 flex-1 rounded-lg border border-dashed"
            scrollbars="vertical"
          >
            <KanbanColumnContent
              value={id}
              className={cn(
                "flex min-h-full flex-col gap-3 p-2 pr-3",
                reports.length === 0 && "items-center justify-center"
              )}
            >
              {reports.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No approvals here.
                </p>
              ) : (
                children
              )}
            </KanbanColumnContent>
          </ScrollArea>
        </CardContent>
      </Card>
    </KanbanColumn>
  )
}
