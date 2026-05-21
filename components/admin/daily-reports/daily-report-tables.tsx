"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getStatusBadgeClassName,
  getStatusBadgeVariant,
} from "@/lib/approval-statuses"
import type {
  DailyApprovalLogEntry,
  DailyBlockerEntry,
  DailyBrandSummary,
  DailyEmployeeSummary,
  DailyMissingEntry,
  DailyTaskLogEntry,
} from "@/lib/daily-report-types"
import { getTaskStatusColorClass, getTaskStatusLabel } from "@/lib/task-statuses"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function SummaryTable({
  title,
  description,
  emptyMessage,
  headers,
  rows,
}: {
  title: string
  description: string
  emptyMessage: string
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <div className="min-w-[720px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="px-3 py-6 text-muted-foreground"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  rows.map((cells, index) => (
                    <tr key={index} className="border-b align-top">
                      {cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function DailyReportBrandSummaryTable({
  summaries,
}: {
  summaries: DailyBrandSummary[]
}) {
  return (
    <SummaryTable
      title="Brand Summary"
      description="Graded task and approval metrics by brand."
      emptyMessage="No brand activity for the selected filters."
      headers={[
        "Brand",
        "Graded",
        "Done",
        "Pending",
        "Blockers",
        "Approvals",
        "Approved",
        "Approval %",
        "Completion %",
      ]}
      rows={summaries.map((summary) => [
        summary.brandName,
        summary.gradedTotal,
        summary.gradedDone,
        summary.pendingTasks,
        summary.blockerTasks,
        summary.approvalsSubmitted,
        summary.fullyApproved,
        `${summary.approvalRate}%`,
        `${summary.completionRate}%`,
      ])}
    />
  )
}

export function DailyReportEmployeeSummaryTable({
  summaries,
}: {
  summaries: DailyEmployeeSummary[]
}) {
  return (
    <SummaryTable
      title="Employee Summary"
      description="Graded accountability and approval activity by employee."
      emptyMessage="No employee activity for the selected filters."
      headers={[
        "Employee",
        "Graded",
        "Done",
        "Pending",
        "Blockers",
        "Revisions",
        "Approvals",
        "Approved",
        "Completion %",
        "Points",
      ]}
      rows={summaries.map((summary) => [
        <div key={summary.profileId}>
          <div className="font-medium">{summary.fullName}</div>
          <div className="text-xs text-muted-foreground">{summary.email}</div>
        </div>,
        summary.assignedGradedTasks,
        summary.doneGradedTasks,
        summary.pendingTasks,
        summary.blockerTasks,
        summary.revisionTasks,
        summary.approvalsSubmitted,
        summary.approvalsApproved,
        `${summary.gradedCompletionRate}%`,
        `${summary.taskPoints} pts`,
      ])}
    />
  )
}

export function DailyReportTaskLogTable({
  entries,
}: {
  entries: DailyTaskLogEntry[]
}) {
  return (
    <SummaryTable
      title="To-Do Task Daily Log"
      description="Read-only task assignments for the selected day."
      emptyMessage="No task assignments found for the selected filters."
      headers={[
        "Task",
        "Assignee",
        "Created by",
        "Brand",
        "Type",
        "Priority",
        "Status",
        "Due",
        "Completed",
        "Proof",
        "Updated",
      ]}
      rows={entries.map((entry) => [
        <div key={entry.assignmentId}>
          <div className="font-medium">{entry.title}</div>
          {entry.isOverdue || entry.isMissingProof ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.isOverdue ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : null}
              {entry.isMissingProof ? (
                <Badge variant="outline">Missing proof</Badge>
              ) : null}
            </div>
          ) : null}
        </div>,
        entry.assigneeName,
        entry.createdByName,
        entry.brandName ?? "—",
        entry.taskType === "GRADED" ? "Graded" : "Personal",
        entry.priority ?? "—",
        <Badge
          key={`${entry.assignmentId}-status`}
          variant="outline"
          className={getTaskStatusColorClass(entry.status)}
        >
          {getTaskStatusLabel(entry.status)}
        </Badge>,
        entry.dueDate ? dateFormatter.format(new Date(entry.dueDate)) : "—",
        entry.completedAt
          ? dateFormatter.format(new Date(entry.completedAt))
          : "—",
        entry.proofStatus,
        dateFormatter.format(new Date(entry.updatedAt)),
      ])}
    />
  )
}

export function DailyReportApprovalLogTable({
  entries,
}: {
  entries: DailyApprovalLogEntry[]
}) {
  return (
    <SummaryTable
      title="Content Approval Daily Log"
      description="Read-only content reports for the selected day."
      emptyMessage="No content approvals found for the selected filters."
      headers={[
        "Submitted",
        "By",
        "Brand",
        "Type",
        "Platform",
        "Caption",
        "Supervisor",
        "Director",
        "Publish",
        "Scheduled",
      ]}
      rows={entries.map((entry) => [
        dateFormatter.format(new Date(entry.dateSubmitted)),
        entry.submittedByName,
        entry.brandName ?? "—",
        entry.contentType,
        entry.platform,
        entry.captionPreview,
        <Badge
          key={`${entry.id}-supervisor`}
          variant={getStatusBadgeVariant(entry.supervisorStatus)}
          className={getStatusBadgeClassName(entry.supervisorStatus)}
        >
          {entry.supervisorStatus}
        </Badge>,
        <Badge
          key={`${entry.id}-director`}
          variant={getStatusBadgeVariant(entry.directorStatus)}
          className={getStatusBadgeClassName(entry.directorStatus)}
        >
          {entry.directorStatus}
        </Badge>,
        <Badge
          key={`${entry.id}-publish`}
          variant={getStatusBadgeVariant(entry.publishStatus)}
          className={getStatusBadgeClassName(entry.publishStatus)}
        >
          {entry.publishStatus}
        </Badge>,
        entry.scheduledPublishedDate
          ? dateFormatter.format(new Date(entry.scheduledPublishedDate))
          : "—",
      ])}
    />
  )
}

export function DailyReportBlockersSection({
  blockers,
  missingItems,
  alertSummary,
}: {
  blockers: DailyBlockerEntry[]
  missingItems: DailyMissingEntry[]
  alertSummary: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Blockers / Missing</CardTitle>
        <CardDescription>{alertSummary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium">Blockers</h3>
          {blockers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blockers reported.</p>
          ) : (
            <div className="space-y-3">
              {blockers.map((blocker) => (
                <div
                  key={blocker.assignmentId}
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
                >
                  <div className="font-medium">{blocker.taskTitle}</div>
                  <p className="mt-1 text-muted-foreground">
                    {blocker.employeeName}
                    {blocker.brandName ? ` · ${blocker.brandName}` : ""}
                  </p>
                  {blocker.blockerNote ? (
                    <p className="mt-2 whitespace-pre-wrap">{blocker.blockerNote}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reported{" "}
                    {blocker.reportedAt
                      ? dateFormatter.format(new Date(blocker.reportedAt))
                      : "—"}{" "}
                    · Assigned by {blocker.createdByName}
                    {blocker.dueDate
                      ? ` · Due ${dateFormatter.format(new Date(blocker.dueDate))}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Needs Attention</h3>
          {missingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No missing items for the selected filters.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {missingItems.map((item, index) => (
                <li
                  key={`${item.kind}-${index}`}
                  className="rounded-md border bg-muted/20 px-3 py-2"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {item.reference}
                  </span>
                  {item.employeeName || item.brandName ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[item.employeeName, item.brandName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
