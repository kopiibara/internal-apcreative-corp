import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DetailsBlockerTimelineGridProps = {
  children: ReactNode
  className?: string
}

export function DetailsBlockerTimelineGrid({
  children,
  className,
}: DetailsBlockerTimelineGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2",
        className
      )}
    >
      {children}
    </div>
  )
}
