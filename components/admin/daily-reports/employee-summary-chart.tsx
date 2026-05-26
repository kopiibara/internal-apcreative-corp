"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/shared/user-avatar"
import {
  toEmployeeChartItems,
  type EmployeeChartItem,
} from "@/lib/daily-reports/daily-report-chart-data"
import type { DailyEmployeeSummary } from "@/lib/daily-reports/daily-report-types"

const employeeChartConfig = {
  completionRate: {
    label: "Completion %",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function EmployeeSummaryTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: EmployeeChartItem }[]
}) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0]?.payload

  if (!item) {
    return null
  }

  return (
    <div className="grid min-w-[220px] gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl">
      <div>
        <p className="font-medium text-foreground">{item.employeeName}</p>
        <p className="text-muted-foreground">{item.email}</p>
      </div>
      <div className="grid gap-0.5 text-muted-foreground">
        <p>Graded tasks: {item.graded}</p>
        <p>Done: {item.done}</p>
        <p>Pending: {item.pending}</p>
        <p>Blockers: {item.blockers}</p>
        <p>Revisions: {item.revisions}</p>
        <p>Approvals: {item.approvals}</p>
        <p>Approved: {item.approved}</p>
        <p>Completion: {item.completionRate}%</p>
        <p>Task points: {item.taskPoints} pts</p>
      </div>
    </div>
  )
}

function EmployeeCompactSummary({ items }: { items: EmployeeChartItem[] }) {
  return (
    <ul className="mt-4 grid max-h-36 gap-2 overflow-y-auto border-t pt-3 text-xs">
      {items.map((item) => (
        <li
          key={`${item.employeeName}-${item.email}`}
          className="flex items-center justify-between gap-2 rounded-lg border-2 border-border bg-muted/20 px-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar
              profileId={item.profileId}
              name={item.employeeName}
              email={item.email}
              imageUrl={item.imageUrl}
              size="sm"
            />
            <div className="min-w-0">
            <p className="truncate font-medium">{item.employeeName}</p>
            <p className="truncate text-muted-foreground">
              {item.done}/{item.graded} done · {item.approvals} approvals
            </p>
            </div>
          </div>
          <span className="shrink-0 font-medium tabular-nums">
            {item.taskPoints} pts
          </span>
        </li>
      ))}
    </ul>
  )
}

type EmployeeSummaryChartProps = {
  summaries: DailyEmployeeSummary[]
}

export function EmployeeSummaryChart({
  summaries,
}: EmployeeSummaryChartProps) {
  const chartData = toEmployeeChartItems(summaries)
  const chartHeight = Math.min(360, Math.max(220, chartData.length * 36 + 48))

  return (
    <Card className="flex h-full min-w-0 flex-col gap-3 py-4 md:gap-6 md:py-6">
      <CardHeader className="px-3 md:px-6">
        <CardTitle>Employee Summary</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Graded completion and accountability by employee.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 md:px-6">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No employee activity found for this date.
          </p>
        ) : (
          <>
            <ScrollArea className="w-full min-w-0" scrollbars="horizontal">
              <div className="min-w-full">
                <ChartContainer
                  config={employeeChartConfig}
                  className="aspect-auto w-full"
                  style={{ height: `${chartHeight}px` }}
                >
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="chartLabel"
                      tickLine={false}
                      axisLine={false}
                      width={96}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                      content={<EmployeeSummaryTooltip />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="completionRate"
                      fill="var(--color-completionRate)"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </ScrollArea>
            <EmployeeCompactSummary items={chartData} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
