"use client"

import { CalendarClock, CheckCircle2, ExternalLink, PenLine } from "lucide-react"

import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
import { ApprovalPublishingActions } from "@/components/employee/approvals/approval-publishing-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getApprovalDisplayStatus } from "@/lib/approvals/approval-kanban"
import { getApprovalPublishingPermissions } from "@/lib/approvals/approval-publishing-permissions"
import {
  getRevisionAreaCount,
  getRevisionSummaryLabel,
} from "@/lib/approvals/approval-revision"
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

function getScheduledLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Scheduled"
}

export function EmployeeApprovalKanbanCard({
  report,
  onOpenDetails,
}: EmployeeApprovalKanbanCardProps) {
  const hasSupervisorNote = hasText(report.supervisorNotes)
  const hasDirectorNote = hasText(report.directorNotes)
  const displayStatus = getApprovalDisplayStatus(report)
  const revisionSummary = getRevisionSummaryLabel(report)
  const revisionItemCount = getRevisionAreaCount(report)
  const publishingPermissions = getApprovalPublishingPermissions(report)

  return (
    <Card
      className="cursor-pointer rounded-lg bg-white dark:bg-gray-900 py-2 transition-colors hover:bg-muted"
      onClick={() => onOpenDetails(report)}
    >
      <CardContent className="space-y-3 px-4 py-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="line-clamp-2 font-bold leading-snug">
              {report.brandName ?? "No brand"}

            </h2>
            {report.assetLink ? (
              <Button type="button" size="sm" variant="outline" asChild className="flex h-fit py-1 items-center gap-1.5 text-xs"
              >
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
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary">{report.contentType}</Badge>
            <Badge variant="neutral">{report.platform}</Badge>
          </div>
        </div>

        <p className="text-xs">
          <span className="text-muted-foreground">Submitted by:</span>{" "}
          <span className="font-medium">{report.submittedByName}</span>
        </p>

        <p className="text-xs">
          <span className="text-muted-foreground">Submitted:</span>{" "}
          <span className="font-medium">
            {dateFormatter.format(new Date(report.dateSubmitted))}
          </span>
        </p>

        <ApprovalStatusBadges
          supervisorStatus={report.supervisorStatus}
          directorStatus={report.directorStatus}
          publishStatus={displayStatus.publishStatus}
          compact
        />

        {revisionItemCount > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              Revision: {revisionItemCount} item{revisionItemCount === 1 ? "" : "s"}
            </Badge>
            {revisionSummary ? (
              <Badge variant="outline" className="max-w-full truncate text-[10px]">
                {revisionSummary}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {report.publishStatus === "Scheduled" || report.scheduledPublishedDate || report.publishingProofUrl ? (
          <div className="flex flex-wrap gap-1.5">
            {report.publishStatus === "Scheduled" || report.scheduledPublishedDate ? (
              <Badge variant="secondary" className="gap-1">
                <CalendarClock className="size-3" />
                {getScheduledLabel(report.scheduledPublishedDate)}
              </Badge>
            ) : null}
            {report.publishingProofUrl ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3" />
                Proof: Submitted
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div
          className="flex flex-wrap gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >


          <div className="flex  w-full gap-1.5">
            {hasSupervisorNote ? (
              <Button
                type="button"
                size="sm"
                variant="neutral"
                onClick={() => onOpenDetails(report)}
                className="flex items-center gap-1.5 text-xs"
              >
                <PenLine className="h-2" />
                Supervisor Note
              </Button>
            ) : null}

            {hasDirectorNote ? (
              <Button
                type="button"
                size="sm"
                variant="neutral"
                onClick={() => onOpenDetails(report)}
                className="flex items-center gap-1.5 text-xs"

              >
                <PenLine className="size-3" />
                Director Note
              </Button>
            ) : null}
          </div>
          <ApprovalPublishingActions
            report={report}
            publishingPermissions={publishingPermissions}
            compact
          />
        </div>
      </CardContent>
    </Card>
  )
}
