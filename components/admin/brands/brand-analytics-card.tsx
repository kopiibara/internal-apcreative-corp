import { Card, CardContent } from "@/components/ui/card"
import {
  getBrandAnalyticsCardConfig,
  type BrandAnalyticsMetricKey,
} from "@/lib/brand-analytics-status"
import { cn } from "@/lib/utils"

type BrandAnalyticsCardProps = {
  value: number
  metric: BrandAnalyticsMetricKey
  className?: string
}

export function BrandAnalyticsCard({
  value,
  metric,
  className,
}: BrandAnalyticsCardProps) {
  const config = getBrandAnalyticsCardConfig(metric)
  const Icon = config.icon

  return (
    <Card className={cn("rounded-xl py-4", config.className, className)}>
      <CardContent className="flex items-center gap-3 px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-current/30 bg-background/40">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs opacity-80">{config.label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
