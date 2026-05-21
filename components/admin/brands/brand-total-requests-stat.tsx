import { getBrandAnalyticsCardConfig } from "@/lib/brand-analytics-status"
import { cn } from "@/lib/utils"

type BrandTotalRequestsStatProps = {
  value: number
  className?: string
}

export function BrandTotalRequestsStat({
  value,
  className,
}: BrandTotalRequestsStatProps) {
  const config = getBrandAnalyticsCardConfig("totalRequests")
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border p-3 sm:p-4",
        config.className,
        className
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-current/30 bg-background/40 sm:size-9">
        <Icon className="size-4 sm:size-5" />
      </span>
      <div className="mt-2 min-w-0">
        <p className="text-2xl font-semibold leading-none sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs opacity-80 sm:text-sm">{config.label}</p>
      </div>
    </div>
  )
}
