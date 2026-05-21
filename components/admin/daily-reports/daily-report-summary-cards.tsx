"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DailyReportSummary } from "@/lib/daily-report-types"

type DailyReportSummaryCardsProps = {
  summary: DailyReportSummary
}

const cards: {
  key: keyof DailyReportSummary | "approvalDetail"
  title: string
  description: string
  format: (summary: DailyReportSummary) => string
}[] = [
    {
      key: "dailyCompletionRate",
      title: "Daily Completion",
      description: "Graded assignments completed for the selected day.",
      format: (summary) => `${summary.dailyCompletionRate}%`,
    },

    {
      key: "approvalRate",
      title: "Approval Rate",
      description: "Fully approved content reports for the selected day.",
      format: (summary) => `${summary.approvalRate}%`,
    },
    {
      key: "completedGradedTasks",
      title: "Completed Graded Tasks",
      description: "Graded assignments marked done.",
      format: (summary) =>
        `${summary.completedGradedTasks} / ${summary.totalGradedTasks}`,
    },
    {
      key: "pendingMissingCount",
      title: "Pending / Missing",
      description: "Open graded tasks and pending approvals.",
      format: (summary) => String(summary.pendingMissingCount),
    },
    {
      key: "blockerCount",
      title: "Blockers",
      description: "Graded assignments currently blocked.",
      format: (summary) => String(summary.blockerCount),
    },
  ]

export function DailyReportSummaryCards({
  summary,
}: DailyReportSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.key} size="sm">
          <CardHeader className="gap-1">
            <CardTitle className="text-sm">{card.title}</CardTitle>
            <CardDescription className="text-xs">
              {card.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {card.format(summary)}
            </p>
            {card.key === "approvalRate" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Approved {summary.approvedCount} / {summary.approvalTotal}
              </p>
            ) : card.key === "dailyCompletionRate" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Graded completion {summary.gradedTaskCompletionRate}%
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
