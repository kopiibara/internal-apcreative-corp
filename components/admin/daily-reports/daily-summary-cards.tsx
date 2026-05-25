"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DailyReportSummary } from "@/lib/daily-reports/daily-report-types"
import { cn } from "@/lib/utils"

type DailySummaryCardsProps = {
  summary: DailyReportSummary
}

const cards: {
  key: keyof DailyReportSummary
  title: string
  format: (summary: DailyReportSummary) => string
  detail?: (summary: DailyReportSummary) => string | null
  tone: string
  label: string
}[] = [
    {
      key: "dailyCompletionRate",
      title: "Daily Completion",
      format: (summary) => `${summary.dailyCompletionRate}%`,
      detail: (summary) =>
        `Graded completion ${summary.gradedTaskCompletionRate}%`,
      tone: "bg-background text-foreground",
      label: "01 / OVERVIEW",
    },
    {
      key: "approvalRate",
      title: "Approval Rate",
      format: (summary) => `${summary.approvalRate}%`,
      detail: (summary) =>
        `Approved ${summary.approvedCount} / ${summary.approvalTotal}`,
      tone: "bg-blue text-white",
      label: "02 / APPROVALS",
    },
    {
      key: "completedGradedTasks",
      title: "Completed Graded Tasks",
      format: (summary) =>
        `${summary.completedGradedTasks} / ${summary.totalGradedTasks}`,
      tone: "bg-cyan text-white",
      label: "03 / TASKS",
    },
    {
      key: "pendingMissingCount",
      title: "Pending / Missing",
      format: (summary) => String(summary.pendingMissingCount),
      tone: "bg-magenta text-white",
      label: "04 / ATTENTION",
    },
    {
      key: "blockerCount",
      title: "Blockers",
      format: (summary) => String(summary.blockerCount),
      tone: "bg-red text-white",
      label: "05 / BLOCKERS",
    },
  ]

export function DailySummaryCards({ summary }: DailySummaryCardsProps) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
      {cards.map((card) => {
        const detail = card.detail?.(summary)

        return (
          <Card
            key={card.key}
            className={cn(
              "min-h-[150px] min-w-0 justify-between overflow-hidden px-4 py-4 md:min-h-[190px] md:px-6 md:py-6",
              card.tone
            )}
          >
            <CardHeader className="gap-0 px-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
                {card.label}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 px-0">
              <CardTitle className="text-3xl font-black uppercase leading-[0.9] tracking-normal md:text-4xl">
                {card.format(summary)}
              </CardTitle>
              <CardDescription className="text-xs font-semibold leading-snug opacity-90">
                {card.title}
              </CardDescription>
              {detail ? (
                <p className="text-xs font-semibold opacity-80">{detail}</p>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
