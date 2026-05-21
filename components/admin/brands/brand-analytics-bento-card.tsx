import {
  getBrandAnalyticsCardConfig,
  type BrandAnalyticsBentoItem,
} from "@/lib/brand-analytics-status"
import { cn } from "@/lib/utils"

type BrandAnalyticsBentoCardProps = {
  item: BrandAnalyticsBentoItem
}

export function BrandAnalyticsBentoCard({ item }: BrandAnalyticsBentoCardProps) {
  const config = getBrandAnalyticsCardConfig(item.key)
  const Icon = config.icon

  return (
    <div
      className={cn(
        "group/bento flex h-full min-h-[120px] flex-col justify-between rounded-xl border p-3 transition duration-200 hover:shadow-md sm:p-4",
        config.className,
        item.spanClassName,
        item.isHighlighted && "shadow-sm"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border border-current/30 bg-background/40",
          item.sizeTier === "primary" && "size-8 sm:size-9",
          item.sizeTier === "secondary" && "size-7 sm:size-8",
          item.sizeTier === "compact" && "size-7 sm:size-8"
        )}
      >
        <Icon
          className={cn(
            item.sizeTier === "primary" && "size-4 sm:size-5",
            item.sizeTier === "secondary" && "size-3.5 sm:size-4",
            item.sizeTier === "compact" && "size-3.5 sm:size-4"
          )}
        />
      </span>
      <div className="mt-2 min-w-0">
        <p
          className={cn(
            "font-semibold leading-none",
            item.sizeTier === "primary" && "text-2xl sm:text-3xl",
            item.sizeTier === "secondary" && "text-xl sm:text-2xl",
            item.sizeTier === "compact" && "text-lg sm:text-xl"
          )}
        >
          {item.value}
        </p>
        <p
          className={cn(
            "mt-1 opacity-80",
            item.sizeTier === "primary" && "text-xs sm:text-sm",
            item.sizeTier === "secondary" && "text-[11px] sm:text-xs",
            item.sizeTier === "compact" && "text-[10px] sm:text-xs"
          )}
        >
          {config.label}
        </p>
      </div>
    </div>
  )
}
