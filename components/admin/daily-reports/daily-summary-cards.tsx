"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DailyReportSummary } from "@/lib/daily-report-types"

type DailySummaryCardsProps = {
  summary: DailyReportSummary
}

const cards: {
  key: keyof DailyReportSummary
  title: string
  description: string
  format: (summary: DailyReportSummary) => string
  detail?: (summary: DailyReportSummary) => string | null
}[] = [
    {
      key: "dailyCompletionRate",
      title: "Daily Completion",
      description: "Graded assignments completed for the selected day.",
      format: (summary) => `${summary.dailyCompletionRate}%`,
      detail: (summary) =>
        `Graded completion ${summary.gradedTaskCompletionRate}%`,
    },
    {
      key: "approvalRate",
      title: "Approval Rate",
      description: "Fully approved content reports for the selected day.",
      format: (summary) => `${summary.approvalRate}%`,
      detail: (summary) =>
        `Approved ${summary.approvedCount} / ${summary.approvalTotal}`,
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

export function DailySummaryCards({ summary }: DailySummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
      {cards.map((card) => {
        const detail = card.detail?.(summary)

        return (
          <Card key={card.key} size="sm" className="min-w-0">
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
              {detail ? (
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
