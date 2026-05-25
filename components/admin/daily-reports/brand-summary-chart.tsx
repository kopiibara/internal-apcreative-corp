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
    <div className="grid min-w-[200px] gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl">
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
  const chartMinWidth = Math.max(320, chartData.length * 72)

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
            <ScrollArea className="w-full min-w-0" scrollbars="horizontal">
              <div style={{ minWidth: chartMinWidth }}>
                <ChartContainer
                  config={brandChartConfig}
                  className="aspect-auto h-[220px] w-full md:h-[280px]"
                >
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="brandName"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) =>
                        value.length > 12 ? `${value.slice(0, 11)}…` : value
                      }
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                      content={<BrandSummaryTooltip />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="graded"
                      fill="var(--color-graded)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="done"
                      fill="var(--color-done)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      fill="var(--color-pending)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="blockers"
                      fill="var(--color-blockers)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="approvals"
                      fill="var(--color-approvals)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="approved"
                      fill="var(--color-approved)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </ScrollArea>
            {chartData.length <= 6 ? (
              <BrandCompactSummary items={chartData} />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
