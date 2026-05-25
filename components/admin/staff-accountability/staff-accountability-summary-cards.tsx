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
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-4">
        <SummaryCard
          label="01 / COMPLETION"
          title="Average Team Completion"
          value={formatStaffPercent(teamSummary.averageTeamCompletion)}
          detail="Average across included employees"
          tone="bg-background text-foreground"
        />
        <SummaryCard
          label="02 / POINTS"
          title="Total Team Points"
          value={`${teamSummary.totalTeamPoints}`}
          detail="Sum of employee task points"
          tone="bg-blue text-white"
        />
        <SummaryCard
          label="03 / TASKS"
          title="Total Completed Tasks"
          value={`${teamSummary.totalCompletedTasks}/${teamSummary.totalAssignedTasks}`}
          detail={`${formatStaffPercent(teamSummary.teamCompletionRate)} completed`}
          tone="bg-cyan text-white"
        />
        <SummaryCard
          label="04 / ATTENTION"
          title="Needs Attention"
          value={String(teamSummary.needsAttentionCount)}
          detail="Pending, revision, and blocker tasks"
          tone="bg-magenta text-white"
        />
      </div>
    </section>
  )
}
