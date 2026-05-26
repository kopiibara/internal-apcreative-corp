import { Clock, ExternalLink } from "lucide-react"

import { ApprovalActivityTimeline } from "@/components/shared/approval-activity-timeline"
import { ApprovalStatusBadges } from "@/components/shared/approval-status-badges"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  getApprovalKanbanStage,
  getApprovalWorkflowStageLabel,
  getEmployeeApprovalKanbanStage,
  getEmployeeApprovalWorkflowStageLabel,
} from "@/lib/approvals/approval-kanban"
import {
  getEmployeeKanbanStageConfig,
  getKanbanStageConfig,
} from "@/lib/approvals/approval-kanban-status"
import type { AccountType } from "@/lib/auth/account-type"
import { cn } from "@/lib/utils"
import type { ApprovalActivityLog, ContentReport } from "@/types/content-report"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not set"
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

type ApprovalDetailSectionProps = {
  title: string
  children: React.ReactNode
  className?: string
}

export function ApprovalDetailSection({
  title,
  children,
  className,
}: ApprovalDetailSectionProps) {
  return (
    <Card className={cn("gap-0 py-0 shadow-none", className)}>
      <CardHeader className="border-b-2 border-border px-4 py-3 items-center">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function LongText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
      <p className="whitespace-pre-wrap break-words">{children}</p>
    </div>
  )
}

type ApprovalSheetHeaderProps = {
  report: ContentReport
  variant?: "admin" | "employee"
  accountType?: AccountType
}

function getKanbanStageLabel(
  report: ContentReport,
  variant: "admin" | "employee",
  accountType?: AccountType
) {
  if (variant === "employee") {
    const stageId = getEmployeeApprovalKanbanStage(report)
    const config = getEmployeeKanbanStageConfig(stageId)
    return {
      label: getEmployeeApprovalWorkflowStageLabel(report),
      badgeClassName: cn(
        "border-2 shadow-none",
        config.badgeClassName,
        config.toneClassName
      ),
    }
  }

  const stageId = getApprovalKanbanStage(report)
  const config = getKanbanStageConfig(stageId)
  return {
    label: getApprovalWorkflowStageLabel(report, { accountType }),
    badgeClassName: cn(
      "border-2 shadow-none",
      config.badgeClassName,
      config.toneClassName
    ),
  }
}

export function ApprovalSheetHeader({
  report,
  variant = "admin",
  accountType,
}: ApprovalSheetHeaderProps) {
  const kanbanStage = getKanbanStageLabel(report, variant, accountType)

  return (
    <>
      <SheetTitle className="flex flex-wrap items-center gap-3 font-medium">
        <span className="text-xl font-bold sm:text-2xl">
          Approval Request #{report.id}
        </span>
        <Badge className={kanbanStage.badgeClassName}>{kanbanStage.label}</Badge>
      </SheetTitle>

    </>
  )
}

type ApprovalDetailsGridProps = {
  main: React.ReactNode
  sidebar: React.ReactNode
}

export function ApprovalDetailsGrid({ main, sidebar }: ApprovalDetailsGridProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 pb-6 xl:grid-cols-[2fr_1fr]">
      <div className="min-w-0 space-y-4">{main}</div>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
        {sidebar}
      </aside>
    </div>
  )
}

type ApprovalMainDetailsProps = {
  report: ContentReport
}

export function ApprovalMainDetails({ report }: ApprovalMainDetailsProps) {
  const captionPreview =
    report.caption.length > 120
      ? `${report.caption.slice(0, 120)}…`
      : report.caption

  return (
    <ApprovalDetailSection title="Request details">
      <div className="space-y-2">
        <div>
          <p className="text-lg font-bold leading-snug">
            {report.brandName ?? "No brand"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{captionPreview}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{report.contentType}</Badge>
          <Badge variant="neutral">{report.platform}</Badge>
        </div>
        {report.assetLink ? (
          <a
            href={report.assetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Open asset
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">No asset link</span>
        )}
        <ApprovalStatusBadges
          supervisorStatus={report.supervisorStatus}
          directorStatus={report.directorStatus}
          publishStatus={report.publishStatus}
          compact
        />
      </div>

      <Separator />
    </ApprovalDetailSection>
  )
}

type DiscussionEntry = {
  id: string
  authorProfileId?: number
  authorName: string
  authorRole: string
  at: string
  label: string
  body: string
}

function buildDiscussionEntries(report: ContentReport): DiscussionEntry[] {
  const entries: DiscussionEntry[] = []

  if (hasText(report.employeeComments)) {
    entries.push({
      id: "employee-comment",
      authorProfileId: report.submittedByProfileId,
      authorName: report.submittedByName,
      authorRole: "Employee",
      at: report.dateSubmitted,
      label: "Employee comment",
      body: report.employeeComments!.trim(),
    })
  }

  if (hasText(report.supervisorNotes)) {
    entries.push({
      id: "supervisor-notes",
      authorName: report.supervisorReviewedByName ?? "Marketing Supervisor",
      authorRole: "Supervisor",
      at: report.supervisorReviewedAt ?? report.updatedAt,
      label: "Supervisor review note",
      body: report.supervisorNotes!.trim(),
    })
  }

  if (hasText(report.directorNotes)) {
    entries.push({
      id: "director-notes",
      authorName: report.directorReviewedByName ?? "Director of Marketing",
      authorRole: "Director",
      at: report.directorReviewedAt ?? report.updatedAt,
      label: "Director review note",
      body: report.directorNotes!.trim(),
    })
  }

  if (hasText(report.remarksRevisionSummary)) {
    entries.push({
      id: "revision-summary",
      authorName: report.directorReviewedByName ?? report.supervisorReviewedByName ?? "Reviewer",
      authorRole: "Revision",
      at: report.updatedAt,
      label: "Revision summary",
      body: report.remarksRevisionSummary!.trim(),
    })
  }

  return entries.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  )
}

function DiscussionCommentItem({ entry }: { entry: DiscussionEntry }) {
  return (
    <article className="flex gap-3 border-b pb-4 border-border last:border-b-0 last:pb-0">
      <div className="flex flex-col w-full items-start">
        <div className="flex flex-row w-full justify-between items-start">
          <div className="flex flex-row gap-2">
            <UserAvatar
              profileId={entry.authorProfileId}
              name={entry.authorName}
              size="sm"
            />
            <div className="flex flex-col gap-4 ">
              <div className="flex flex-col gap-0">
                <span className="text-sm font-semibold">{entry.authorName}</span>
                <span className="text-sm font-semibold text-muted-foreground">{entry.authorRole}</span>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {entry.body}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {dateTimeFormatter.format(new Date(entry.at))}
          </span>
        </div>
      </div>
    </article>
  )
}

type ApprovalCommentsSectionProps = {
  report: ContentReport
}

export function ApprovalCommentsSection({ report }: ApprovalCommentsSectionProps) {
  const entries = buildDiscussionEntries(report)
  const hasComments = entries.length > 0

  return (
    <ApprovalDetailSection title="Comments">
      {hasComments ? (
        <div className="space-y-4">
          {entries.map((entry) => (
            <DiscussionCommentItem key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No comments yet.
        </p>
      )}
    </ApprovalDetailSection>
  )
}

type ApprovalActivitySectionProps = {
  report: ContentReport
  activityLogs?: ApprovalActivityLog[]
}

export function ApprovalActivitySection({
  report,
  activityLogs = report.activityLogs ?? [],
}: ApprovalActivitySectionProps) {
  return (
    <ApprovalDetailSection title="Activity" className="min-h-0">
      <div className="min-h-0">
        <ApprovalActivityTimeline logs={activityLogs} />
      </div>
    </ApprovalDetailSection>
  )
}

type ApprovalDiscussionSectionProps = {
  report: ContentReport
  activityLogs?: ApprovalActivityLog[]
}

/** Combined comments + activity (employee sheet). */
export function ApprovalDiscussionSection({
  report,
  activityLogs = report.activityLogs ?? [],
}: ApprovalDiscussionSectionProps) {
  return (
    <>
      <ApprovalCommentsSection report={report} />
      <ApprovalActivitySection report={report} activityLogs={activityLogs} />
    </>
  )
}

type ApprovalMetadataPanelProps = {
  report: ContentReport
}

export function ApprovalMetadataPanel({ report }: ApprovalMetadataPanelProps) {
  return (
    <>
      <ApprovalDetailSection title="Assignment">
        <div className="space-y-4">
          <DetailField label="Submitted by">
            <div className="space-y-0.5">
              <p className="font-medium">{report.submittedByName}</p>
              <p className="text-xs text-muted-foreground">
                {report.submittedByEmail}
              </p>
            </div>
          </DetailField>
          <DetailField label="Submitted date">
            {dateTimeFormatter.format(new Date(report.dateSubmitted))}
          </DetailField>

          {report.supervisorReviewedByName ? (
            <DetailField label="Supervisor reviewed by">
              {report.supervisorReviewedByName}
              {report.supervisorReviewedAt
                ? ` · ${dateTimeFormatter.format(new Date(report.supervisorReviewedAt))}`
                : null}
            </DetailField>
          ) : null}
          {report.directorReviewedByName ? (
            <DetailField label="Director reviewed by">
              {report.directorReviewedByName}
              {report.directorReviewedAt
                ? ` · ${dateTimeFormatter.format(new Date(report.directorReviewedAt))}`
                : null}
            </DetailField>
          ) : null}
        </div>
      </ApprovalDetailSection>

      <ApprovalDetailSection title="Schedule & content">
        <div className="space-y-4">
          <DetailField label="Scheduled / published">
            {formatDateLabel(report.scheduledPublishedDate)}
          </DetailField>
          <DetailField label="Content type">{report.contentType}</DetailField>
          <DetailField label="Platform">{report.platform}</DetailField>
          <DetailField label="Created">
            {dateTimeFormatter.format(new Date(report.createdAt))}
          </DetailField>
          <DetailField label="Last updated">
            {dateTimeFormatter.format(new Date(report.updatedAt))}
          </DetailField>
        </div>
      </ApprovalDetailSection>

      {report.publishStatus === "Published" ? (
        <ApprovalDetailSection title="Publishing proof">
          <div className="space-y-4">
            <DetailField label="Proof">
              {report.publishingProofUrl ? (
                <a
                  href={report.publishingProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Open proof
                </a>
              ) : (
                "Not submitted"
              )}
            </DetailField>
            {report.publishingProofNote ? (
              <DetailField label="Proof note">
                <LongText>{report.publishingProofNote}</LongText>
              </DetailField>
            ) : null}
            {report.publishingProofSubmittedByName ? (
              <DetailField label="Proof submitted by">
                {report.publishingProofSubmittedByName}
                {report.publishingProofSubmittedAt
                  ? ` Â· ${dateTimeFormatter.format(new Date(report.publishingProofSubmittedAt))}`
                  : null}
              </DetailField>
            ) : null}
            {report.publishedByName ? (
              <DetailField label="Published by">
                {report.publishedByName}
                {report.publishedAt
                  ? ` Â· ${dateTimeFormatter.format(new Date(report.publishedAt))}`
                  : null}
              </DetailField>
            ) : null}
          </div>
        </ApprovalDetailSection>
      ) : null}
    </>
  )
}
