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
  chartHoverCursor,
} from "@/components/ui/chart"
import {
  getCategoryAxisWidth,
  getCategoryChartHeight,
} from "@/lib/chart-layout"
import {
  toBrandChartItems,
  type BrandChartItem,
} from "@/lib/daily-reports/daily-report-chart-data"
import type { DailyBrandSummary } from "@/lib/daily-reports/daily-report-types"

const brandChartConfig = {
  graded: {
    label: "Graded",
    color: "var(--chart-1)",
  },
  done: {
    label: "Done",
    color: "var(--chart-2)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-3)",
  },
  blockers: {
    label: "Blockers",
    color: "var(--chart-4)",
  },
  approvals: {
    label: "Approvals",
    color: "var(--chart-5)",
  },
  approved: {
    label: "Approved",
    color: "var(--success)",
  },
} satisfies ChartConfig

function BrandSummaryTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: BrandChartItem }[]
}) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0]?.payload

  if (!item) {
    return null
  }

  return (
    <div className="grid min-w-50 gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{item.brandName}</p>
      <div className="grid gap-0.5 text-muted-foreground">
        <p>Graded: {item.graded}</p>
        <p>Done: {item.done}</p>
        <p>Pending: {item.pending}</p>
        <p>Blockers: {item.blockers}</p>
        <p>Approvals: {item.approvals}</p>
        <p>Approved: {item.approved}</p>
        <p>Completion: {item.completionRate}%</p>
        <p>Approval rate: {item.approvalRate}%</p>
      </div>
    </div>
  )
}

function BrandCompactSummary({ items }: { items: BrandChartItem[] }) {
  return (
    <ul className="mt-4 grid gap-2 border-t pt-3 text-xs sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.brandName}
          className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 px-2 py-1.5"
        >
          <span className="truncate font-medium">{item.brandName}</span>
          <span className="shrink-0 text-muted-foreground">
            {item.completionRate}% · {item.approvalRate}% appr.
          </span>
        </li>
      ))}
    </ul>
  )
}

type BrandSummaryChartProps = {
  summaries: DailyBrandSummary[]
}

export function BrandSummaryChart({ summaries }: BrandSummaryChartProps) {
  const chartData = toBrandChartItems(summaries)
  const axisWidth = getCategoryAxisWidth(
    chartData.map((item) => item.brandName),
  )
  const chartHeight = getCategoryChartHeight(chartData.length, {
    rowHeight: 44,
    max: 560,
  })

  return (
    <Card className="flex h-full min-w-0 flex-col gap-3 py-4 md:gap-6 md:py-6">
      <CardHeader className="px-3 md:px-6">
        <CardTitle>Brand Summary</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Graded tasks and approvals by brand for the selected day.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 md:px-6">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No brand activity found for this date.
          </p>
        ) : (
          <>
            <ChartContainer
              config={brandChartConfig}
              className="aspect-auto w-full min-w-0"
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
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="chartLabel"
                  tickLine={false}
                  axisLine={false}
                  width={axisWidth}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={chartHoverCursor}
                  content={<BrandSummaryTooltip />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="graded"
                  fill="var(--color-graded)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="done"
                  fill="var(--color-done)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="pending"
                  fill="var(--color-pending)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="blockers"
                  fill="var(--color-blockers)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="approvals"
                  fill="var(--color-approvals)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
                <Bar
                  dataKey="approved"
                  fill="var(--color-approved)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                />
              </BarChart>
            </ChartContainer>
            {chartData.length <= 6 ? (
              <BrandCompactSummary items={chartData} />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
