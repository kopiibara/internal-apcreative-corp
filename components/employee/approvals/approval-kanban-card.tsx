"use client"

import { ExternalLink, Clock, Paperclip, PenLine } from "lucide-react"

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
      size="sm"
      className="cursor-pointer rounded-md border px-1.5 py-1 transition-colors hover:bg-muted"
      onClick={() => onOpenDetails(report)}
    >
      <CardContent className="space-y-3 p-1">
        <p className="truncate text-md font-bold">
          {report.brandName ?? "No brand"}
        </p>

        <div className="flex flex-row gap-2">

          <Badge className="bg-gray-200">
            <Clock /> {dateFormatter.format(new Date(report.dateSubmitted))}
          </Badge>

          <Badge >

            {report.assetLink ? (
              <a
                href={report.assetLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                <ExternalLink className="size-3" />
                Open asset
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">No asset link</span>
            )}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary"> <Paperclip />{report.contentType}</Badge>
          <Badge variant="neutral">{report.platform}</Badge>
        </div>


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
                <Badge variant="secondary" className="text-[10px] px-1.5 inline-flex items-center gap-1 underline-offset-2 hover:underline">
                  <PenLine />
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
                <Badge variant="secondary" className="text-[10px] px-1.5 inline-flex items-center gap-1 underline-offset-2 hover:underline">
                  <PenLine />
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
