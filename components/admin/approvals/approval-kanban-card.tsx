"use client"

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Paperclip,
  PenLine,
} from "lucide-react"

import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getApprovalDisplayStatus } from "@/lib/approvals/approval-kanban"
import {
  getRevisionAreaCount,
  getRevisionSummaryLabel,
} from "@/lib/approvals/approval-revision"
import type { ContentReport } from "@/types/content-report"

type ApprovalKanbanCardProps = {
  report: ContentReport
  onClick: () => void
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

export function ApprovalKanbanCard({
  report,
  onClick,
}: ApprovalKanbanCardProps) {
  const hasSupervisorNote = hasText(report.supervisorNotes)
  const hasDirectorNote = hasText(report.directorNotes)
  const displayStatus = getApprovalDisplayStatus(report)
  const revisionSummary = getRevisionSummaryLabel(report)
  const revisionItemCount = getRevisionAreaCount(report)

  return (
    <Card
      className="w-full max-w-full cursor-pointer overflow-hidden rounded-lg  px-0 py-2 hover:bg-muted hover:-translate-y-0.5 transition-all bg-white dark:bg-gray-900"
      onClick={onClick}
    >
      <CardContent className="min-w-0 space-y-2.5 px-3 py-1">
        <p className="truncate text-md font-bold">
          {report.brandName ?? "No brand"}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <UserAvatar
            profileId={report.submittedByProfileId}
            name={report.submittedByName}
            email={report.submittedByEmail}
            imageUrl={report.submittedByImageUrl}
            size="sm"
          />
          <p className="truncate">
            Submitted by <strong>{report.submittedByName}</strong>
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Badge className="bg-gray-200 dark:bg-gray-800">
            <Clock /> {dateFormatter.format(new Date(report.dateSubmitted))}
          </Badge>

          <Badge>
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
          <Badge variant="secondary">
            <Paperclip />
            {report.contentType}
          </Badge>
          <Badge variant="neutral">{report.platform}</Badge>
        </div>

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
                onClick={onClick}
              >
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-1 px-1.5 text-[10px] underline-offset-2 hover:underline"
                >
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
                onClick={onClick}
              >
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-1 px-1.5 text-[10px] underline-offset-2 hover:underline"
                >
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
