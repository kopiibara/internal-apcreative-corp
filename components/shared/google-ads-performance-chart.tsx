"use client"

import { BarChart3 } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { GoogleAdsMetric } from "@/lib/ads-campaigns-types"
import {
  buildGoogleAdsChartConfig,
  buildGoogleAdsChartData,
  getGoogleAdsMetricAvailability,
  GOOGLE_ADS_CHART_METRICS,
} from "@/lib/ads-campaigns/google-ads-metrics-display"

type GoogleAdsPerformanceChartProps = {
  metrics: GoogleAdsMetric[]
  description?: string
}

export function GoogleAdsPerformanceChart({
  metrics,
  description = "Time series from imported CSV rows.",
}: GoogleAdsPerformanceChartProps) {
  const availability = getGoogleAdsMetricAvailability(metrics)
  const chartData = buildGoogleAdsChartData(metrics, availability)
  const chartConfig = buildGoogleAdsChartConfig(availability)
  const activeMetrics = GOOGLE_ADS_CHART_METRICS.filter(
    (metric) => availability[metric.availabilityKey],
  )

  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5" />
          Google Ads Performance
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || activeMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Import Google Ads CSV data to show the performance chart.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[240px] w-full md:h-[320px]"
          >
            <LineChart data={chartData} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} width={44} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {activeMetrics.map((metric) => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={`var(--color-${metric.key})`}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
