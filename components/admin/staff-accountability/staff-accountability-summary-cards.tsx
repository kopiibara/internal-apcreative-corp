"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { StaffAccountabilityData } from "@/lib/tasks/tasks"
import { formatStaffPercent } from "@/lib/staff-accountability/format"
import { cn } from "@/lib/utils"

type SummaryCardProps = {
  label: string
  title: string
  value: string
  detail: string
  tone: string
}

function SummaryCard({ label, title, value, detail, tone }: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "min-h-[150px] min-w-0 justify-between overflow-hidden px-4 py-4 md:min-h-[190px] md:px-6 md:py-6",
        tone,
      )}
    >
      <CardHeader className="gap-0 px-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        <CardTitle className="text-3xl font-black uppercase leading-[0.9] tracking-normal md:text-4xl">
          {value}
        </CardTitle>
        <CardDescription className="text-xs font-semibold leading-snug opacity-90">
          {title}
        </CardDescription>
        <p className="text-xs font-semibold opacity-80">{detail}</p>
      </CardContent>
    </Card>
  )
}

export function StaffAccountabilitySummaryCards({
  data,
}: {
  data: StaffAccountabilityData
}) {
  const { teamSummary } = data

  return (
    <section className="space-y-3">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          label="01 / COMPLETION"
          title="Average Team Completion"
          value={formatStaffPercent(teamSummary.averageTeamCompletion)}
          detail="Completed graded tasks / assigned graded tasks"
          tone="bg-background text-foreground"
        />
        <SummaryCard
          label="02 / TASK POINTS"
          title="Task Points"
          value={`${teamSummary.totalTaskPoints}`}
          detail="15 points per completed task minus late deductions"
          tone="bg-blue text-white"
        />
        <SummaryCard
          label="03 / LATE DEDUCTION"
          title="Late Task Deductions"
          value={`-${teamSummary.totalLateTaskDeductionPoints}`}
          detail="2 points per 30 minutes late on proof submission"
          tone="bg-magenta text-white"
        />
        <SummaryCard
          label="04 / DAILY PROGRESS"
          title="Daily Progress Net"
          value={`${teamSummary.totalDailyProgressNetPoints}`}
          detail={`${teamSummary.missedDailyProgressReports} missed reports`}
          tone="bg-cyan text-white"
        />
        <SummaryCard
          label="05 / TOTAL"
          title="Total Points"
          value={String(teamSummary.totalTeamPoints)}
          detail="Task points + daily progress net"
          tone="bg-background text-foreground border-2 border-border"
        />
      </div>
    </section>
  )
}
