"use client"

import { ExternalLink, PenLine } from "lucide-react"

import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
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
      className="cursor-pointer rounded-lg bg-white py-2 transition-colors hover:bg-muted"
      onClick={() => onOpenDetails(report)}
    >
      <CardContent className="space-y-3 px-4 py-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 font-bold leading-snug">
            {report.brandName ?? "No brand"}
          </h2>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary">{report.contentType}</Badge>
            <Badge variant="neutral">{report.platform}</Badge>
          </div>
        </div>

        <p className="text-xs">
          <span className="text-muted-foreground">Submitted:</span>{" "}
          <span className="font-medium">
            {dateFormatter.format(new Date(report.dateSubmitted))}
          </span>
        </p>

        <ApprovalStatusBadges
          supervisorStatus={report.supervisorStatus}
          directorStatus={report.directorStatus}
          publishStatus={report.publishStatus}
          compact
        />

        <div
          className="flex flex-wrap gap-1.5 pt-1"
          onClick={(event) => event.stopPropagation()}
        >
          {report.assetLink ? (
            <Button type="button" size="sm" variant="neutral" asChild>
              <a
                href={report.assetLink}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-3" />
                Open asset
              </a>
            </Button>
          ) : null}

          {hasSupervisorNote ? (
            <Button
              type="button"
              size="sm"
              variant="neutral"
              onClick={() => onOpenDetails(report)}
            >
              <PenLine className="size-3" />
              Supervisor Note
            </Button>
          ) : null}

          {hasDirectorNote ? (
            <Button
              type="button"
              size="sm"
              variant="neutral"
              onClick={() => onOpenDetails(report)}
            >
              <PenLine className="size-3" />
              Director Note
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
