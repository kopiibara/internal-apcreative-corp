"use client"

import type { ReactNode } from "react"

import { StatusBadge } from "@/components/shared/status-badge"
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  DailyApprovalLogEntry,
  DailyBlockerEntry,
  DailyMissingEntry,
  DailyTaskLogEntry,
} from "@/lib/daily-reports/daily-report-types"

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
    <Card className="min-w-0 gap-3 py-4 md:gap-6 md:py-6">
      <CardHeader className="px-3 md:px-6">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        <DataTableScrollArea className="h-[320px] max-h-[320px] md:h-[420px] md:max-h-[420px]">
          <Table className="min-w-[720px] border-0">
            <TableHeader className={DATA_TABLE_HEADER_CLASS}>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className={DATA_TABLE_BODY_CLASS}>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={headers.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((cells, index) => (
                  <TableRow key={index}>
                    {cells.map((cell, cellIndex) => (
                      <TableCell key={cellIndex} className="align-top">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableScrollArea>
      </CardContent>
    </Card>
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
      description=" "
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
                <StatusBadge status="OVERDUE" />
              ) : null}
              {entry.isMissingProof ? (
                <StatusBadge status="MISSING" type="proof" />
              ) : null}
            </div>
          ) : null}
        </div>,
        entry.assigneeName,
        entry.createdByName,
        entry.brandName ?? "—",
        entry.taskType === "GRADED" ? (
          <StatusBadge status="GRADED" />
        ) : (
          <StatusBadge status="NON_GRADED" />
        ),
        entry.priority ? (
          <StatusBadge status={entry.priority} type="priority" />
        ) : (
          "—"
        ),
        <StatusBadge
          key={`${entry.assignmentId}-status`}
          status={entry.status}
          type="task"
        />,
        entry.dueDate ? dateFormatter.format(new Date(entry.dueDate)) : "—",
        entry.completedAt
          ? dateFormatter.format(new Date(entry.completedAt))
          : "—",
        <StatusBadge
          key={`${entry.assignmentId}-proof`}
          status={entry.proofStatus}
          type="proof"
        />,
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
      description=""
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
        <StatusBadge
          key={`${entry.id}-supervisor`}
          status={entry.supervisorStatus}
          type="approval"
        />,
        <StatusBadge
          key={`${entry.id}-director`}
          status={entry.directorStatus}
          type="approval"
        />,
        <StatusBadge
          key={`${entry.id}-publish`}
          status={entry.publishStatus}
          type="publish"
        />,
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
    <Card className="flex h-full min-h-0 flex-col gap-3 py-4 md:gap-6 md:py-6">
      <CardHeader className="px-3 md:px-6">
        <CardTitle>Blockers / Missing</CardTitle>
        <CardDescription>{alertSummary}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-3 pt-0 md:px-6">
        <ScrollArea className="h-[320px] max-h-[320px] pr-3 md:h-[420px] md:max-h-[420px]" scrollbars="vertical">
          <div className="space-y-6 pb-1">
            <div>
              <h3 className="mb-2 text-sm font-medium">Blockers</h3>
              {blockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No blockers reported.
                </p>
              ) : (
                <div className="space-y-3">
                  {blockers.map((blocker) => (
                    <div
                      key={blocker.assignmentId}
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
                    >
                      <div className="font-medium">{blocker.taskTitle}</div>
                      <p className="mt-1 text-muted-foreground">
                        {blocker.employeeName}
                        {blocker.brandName ? ` · ${blocker.brandName}` : ""}
                      </p>
                      {blocker.blockerNote ? (
                        <p className="mt-2 whitespace-pre-wrap">
                          {blocker.blockerNote}
                        </p>
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
                      className="rounded-lg border bg-muted/20 px-3 py-2"
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
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
