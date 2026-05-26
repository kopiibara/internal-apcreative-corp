"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PlatformChartConfig } from "@/lib/platform-analytics/types";

type PlatformAnalyticsChartsProps = {
  charts: PlatformChartConfig[];
  isDemo: boolean;
  emptyMessage?: string;
};

export function PlatformAnalyticsCharts({
  charts,
  isDemo,
  emptyMessage = "No live data yet",
}: PlatformAnalyticsChartsProps) {
  if (charts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {charts.map((chart) => (
        <ChartCard key={chart.id} chart={chart} isDemo={isDemo} />
      ))}
    </div>
  );
}

function ChartCard({
  chart,
  isDemo,
}: {
  chart: PlatformChartConfig;
  isDemo: boolean;
}) {
  const config = chart.keys.reduce((acc, key) => {
    acc[key.key] = { label: key.label, color: key.color };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{chart.title}</CardTitle>
        {chart.description ? (
          <CardDescription>{chart.description}</CardDescription>
        ) : null}
        {isDemo ? (
          <CardDescription className="text-amber-700">
            Sample Data
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="aspect-video min-h-55 w-full"
        >
          {chart.chartType === "bar" ? (
            <BarChart data={chart.data} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {chart.keys.map((key) => (
                <Bar
                  key={key.key}
                  dataKey={key.key}
                  fill={key.color}
                  radius={4}
                />
              ))}
            </BarChart>
          ) : chart.chartType === "area" ? (
            <AreaChart data={chart.data} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {chart.keys.map((key) => (
                <Area
                  key={key.key}
                  type="monotone"
                  dataKey={key.key}
                  stroke={key.color}
                  fill={key.color}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chart.data} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {chart.keys.map((key) => (
                <Line
                  key={key.key}
                  type="monotone"
                  dataKey={key.key}
                  stroke={key.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
