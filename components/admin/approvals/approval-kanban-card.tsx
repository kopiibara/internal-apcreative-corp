"use client"

import { ExternalLink } from "lucide-react"

import { ApprovalStatusBadges } from "@/components/admin/approvals/approval-status-badges"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ContentReport } from "@/types/content-report"

type ApprovalKanbanCardProps = {
  report: ContentReport
  onClick: () => void
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export function ApprovalKanbanCard({
  report,
  onClick,
}: ApprovalKanbanCardProps) {
  return (
    <Card
      size="sm"
      className="cursor-pointer rounded-md py-2 transition-colors hover:bg-muted/40"
      onClick={onClick}
    >
      <CardContent className="space-y-3 p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {report.submittedByName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {report.brandName ?? "No brand"} /{" "}
              {dateFormatter.format(new Date(report.dateSubmitted))}
            </p>
          </div>
        </div>

        <div className="flex flex-row flex-wrap gap-1.5">
          <Badge variant="secondary">{report.contentType}</Badge>
          <Badge variant="outline">{report.platform}</Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          {report.assetLink ? (
            <a
              href={report.assetLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Open asset
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">No asset link</span>
          )}
        </div>

        <ApprovalStatusBadges
          supervisorStatus={report.supervisorStatus}
          directorStatus={report.directorStatus}
          publishStatus={report.publishStatus}
        />
      </CardContent>
    </Card>
  )
}
