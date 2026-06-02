"use client"

import type { ComponentProps, ReactNode } from "react"
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Paperclip,
  PenLine,
  RotateCcw,
  XCircle,
} from "lucide-react"

import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RichTextPreview } from "@/components/ui/rich-text-renderer"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getApprovalDisplayStatus } from "@/lib/approvals/approval-kanban"
import { isRichTextEmpty } from "@/lib/rich-text/rich-text"
import {
  getRevisionAreaCount,
  getRevisionSummaryLabel,
} from "@/lib/approvals/approval-revision"
import type { ReviewStatus } from "@/app/employee/approvals/schema"
import type { ContentReport } from "@/types/content-report"

type ApprovalKanbanCardProps = {
  report: ContentReport
  onClick: () => void
  canSupervisorReview?: boolean
  canDirectorReview?: boolean
  readOnly?: boolean
  onReviewAction?: (
    report: ContentReport,
    reviewer: "supervisor" | "director",
    status: ReviewStatus,
  ) => void
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

function ReviewIconButton({
  label,
  disabled,
  variant,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  variant: ComponentProps<typeof Button>["variant"]
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={variant}
          className="size-8 shrink-0"
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            onClick()
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ApprovalKanbanCard({
  report,
  onClick,
  canSupervisorReview = false,
  canDirectorReview = false,
  readOnly = false,
  onReviewAction,
}: ApprovalKanbanCardProps) {
  const hasSupervisorNote = hasText(report.supervisorNotes)
  const hasDirectorNote = hasText(report.directorNotes)
  const displayStatus = getApprovalDisplayStatus(report)
  const revisionSummary = getRevisionSummaryLabel(report)
  const revisionItemCount = getRevisionAreaCount(report)
  const reviewActions: {
    reviewer: "supervisor" | "director"
    label: string
    currentStatus: ReviewStatus
  }[] = []

  if (!readOnly && canSupervisorReview) {
    reviewActions.push({
      reviewer: "supervisor",
      label: "Supervisor",
      currentStatus: report.supervisorStatus,
    })
  }

  if (!readOnly && canDirectorReview) {
    reviewActions.push({
      reviewer: "director",
      label: "Director",
      currentStatus: report.directorStatus,
    })
  }

  return (
    <Card
      className="w-full max-w-full cursor-pointer overflow-hidden rounded-lg bg-white px-0 py-2 transition-all hover:-translate-y-0.5 hover:bg-muted dark:bg-gray-900"
      onClick={onClick}
    >
      <CardContent className="min-w-0 space-y-2.5 px-4 py-2">
        <p className="truncate text-md font-bold">
          {report.brandName ?? "No brand"}
        </p>

        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-gray-200 dark:bg-gray-800">
            <Clock className="size-3" />
            {dateFormatter.format(new Date(report.dateSubmitted))}
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
            <Paperclip className="size-3" />
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
              className="h-8 gap-1 px-3 text-[11px] w-fit"
              onClick={onClick}
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
              className="h-8 gap-1 px-3 text-[11px] w-fit"
              onClick={onClick}
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
            {reviewActions.length > 0 ? (
              <TooltipProvider>
                {reviewActions.map((action) => (
                  <div
                    key={action.reviewer}
                    className="flex shrink-0 items-center gap-1.5"
                  >
                    {reviewActions.length > 1 ? (
                      <span className="max-w-14 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {action.label}
                      </span>
                    ) : null}
                    <ReviewIconButton
                      label="Approve"
                      variant="default"
                      disabled={action.currentStatus === "Approved"}
                      onClick={() =>
                        onReviewAction?.(report, action.reviewer, "Approved")
                      }
                    >
                      <CheckCircle2 className="size-4" />
                    </ReviewIconButton>
                    <ReviewIconButton
                      label="Revision"
                      variant="neutral"
                      disabled={action.currentStatus === "Revision"}
                      onClick={() =>
                        onReviewAction?.(report, action.reviewer, "Revision")
                      }
                    >
                      <RotateCcw className="size-4" />
                    </ReviewIconButton>
                    <ReviewIconButton
                      label="Reject"
                      variant="destructive"
                      disabled={action.currentStatus === "Rejected"}
                      onClick={() =>
                        onReviewAction?.(report, action.reviewer, "Rejected")
                      }
                    >
                      <XCircle className="size-4" />
                    </ReviewIconButton>
                  </div>
                ))}
              </TooltipProvider>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
