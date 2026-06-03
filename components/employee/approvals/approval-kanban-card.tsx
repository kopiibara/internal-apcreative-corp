"use client"

import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  PenLine,
  Pencil,
  Trash2,
} from "lucide-react"

import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
import { ApprovalPublishingActions } from "@/components/employee/approvals/approval-publishing-actions"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getApprovalDisplayStatus } from "@/lib/approvals/approval-kanban"
import { getApprovalPublishingPermissions } from "@/lib/approvals/approval-publishing-permissions"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import {
  getRevisionAreaCount,
  getRevisionSummaryLabel,
} from "@/lib/approvals/approval-revision"
import { useContentReportStore } from "@/stores/use-content-report-store"
import { canEmployeeEditOwnReport } from "@/types/content-report"
import type { ContentReport } from "@/types/content-report"

type EmployeeApprovalKanbanCardProps = {
  report: ContentReport
  currentProfileId: number
  onOpenDetails: (report: ContentReport) => void
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function getScheduledLabel(value: string | null) {
  return value ? formatRecentOrDateTime(value, dateFormatter) : "Scheduled"
}

export function EmployeeApprovalKanbanCard({
  report,
  currentProfileId,
  onOpenDetails,
}: EmployeeApprovalKanbanCardProps) {
  const openEditDialog = useContentReportStore((state) => state.openEditDialog)
  const openDeleteDialog = useContentReportStore((state) => state.openDeleteDialog)
  const hasSupervisorNote = Boolean(report.supervisorNotes?.trim())
  const hasDirectorNote = Boolean(report.directorNotes?.trim())
  const displayStatus = getApprovalDisplayStatus(report)
  const revisionSummary = getRevisionSummaryLabel(report)
  const revisionItemCount = getRevisionAreaCount(report)
  const publishingPermissions = getApprovalPublishingPermissions(report)
  const canEditOwn = canEmployeeEditOwnReport(report, currentProfileId)

  return (
    <Card
      className="cursor-pointer rounded-lg bg-white  px-0 py-2 transition-colors hover:bg-muted dark:bg-gray-900"
      onClick={() => onOpenDetails(report)}
    >
      <CardContent className="space-y-3 px-4 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="w-full flex flex-row justify-between">
            <h2 className="line-clamp-2 font-bold leading-snug">
              {report.brandName ?? "No brand"}
            </h2>
            <span
              className="text-sm text-muted-foreground flex flex-row gap-1 items-center"
              title={dateFormatter.format(new Date(report.updatedAt))}
            >
              {formatRecentOrDateTime(report.updatedAt, dateFormatter)}
            </span>
          </div>
        </div>
        {report.assetLink ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            asChild
            className="flex h-fit items-center gap-1.5 py-1 text-xs w-fit"
          >
            <a href={report.assetLink} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3" />
              Open asset
            </a>
          </Button>
        ) : null}

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

        {report.publishStatus === "Scheduled" ||
          report.scheduledPublishedDate ||
          report.publishingProofUrl ? (
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

        <div className="flex flex-row gap-2 ">
          {hasSupervisorNote ? (
            <Button
              type="button"
              size="sm"
              variant="neutral"
              className="h-8 gap-1 px-2 text-[11px]"
              onClick={() => onOpenDetails(report)}
            >
              <PenLine className="size-3" />
              Sup. Note
            </Button>
          ) : null}

          {hasDirectorNote ? (
            <Button
              type="button"
              size="sm"
              variant="neutral"
              className="h-8 gap-1 px-2 text-[11px]"
              onClick={() => onOpenDetails(report)}
            >
              <PenLine className="size-3" />
              Dir. Note
            </Button>
          ) : null}
        </div>

        <div
          className="flex items-center gap-2 pt-1"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <UserAvatar
              profileId={report.submittedByProfileId}
              name={report.submittedByName}
              imageUrl={report.submittedByImageUrl}
              size="sm"
            />
            <p className="min-w-0 truncate text-xs font-medium">
              {report.submittedByName}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <ApprovalPublishingActions
              report={report}
              publishingPermissions={publishingPermissions}
              compact
            />

            {canEditOwn ? (
              <>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="neutral"
                  aria-label="Edit approval report"
                  onClick={() => openEditDialog(report)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  aria-label="Delete approval"
                  onClick={() => openDeleteDialog(report)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
