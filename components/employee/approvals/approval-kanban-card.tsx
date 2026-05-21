"use client"

import { ExternalLink } from "lucide-react"

import { ApprovalStatusBadges } from "@/components/admin/approvals/approval-status-badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ContentReport } from "@/types/content-report"

type EmployeeApprovalKanbanCardProps = {
  report: ContentReport
  onOpenDetails: (report: ContentReport) => void
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function hasText(value: string | null) {
  return Boolean(value?.trim())
}

export function EmployeeApprovalKanbanCard({
  report,
  onOpenDetails,
}: EmployeeApprovalKanbanCardProps) {
  const hasSupervisorNote = hasText(report.supervisorNotes)
  const hasDirectorNote = hasText(report.directorNotes)

  return (
    <Card
      size="sm"
      className="cursor-pointer rounded-md border py-2 shadow-sm transition-colors hover:bg-muted/40"
      onClick={() => onOpenDetails(report)}
    >
      <CardContent className="space-y-3 p-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Date submitted</p>
          <p className="text-sm font-medium">
            {dateFormatter.format(new Date(report.dateSubmitted))}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {report.brandName ?? "No brand"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{report.contentType}</Badge>
          <Badge variant="outline">{report.platform}</Badge>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {report.caption}
        </p>

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

        <ApprovalStatusBadges
          supervisorStatus={report.supervisorStatus}
          directorStatus={report.directorStatus}
          publishStatus={report.publishStatus}
          compact
        />

        {hasSupervisorNote || hasDirectorNote ? (
          <div
            className="flex flex-wrap gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            {hasSupervisorNote ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => onOpenDetails(report)}
              >
                <Badge variant="secondary" className="text-[10px]">
                  Supervisor Note
                </Badge>
              </Button>
            ) : null}
            {hasDirectorNote ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => onOpenDetails(report)}
              >
                <Badge variant="secondary" className="text-[10px]">
                  Director Note
                </Badge>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
