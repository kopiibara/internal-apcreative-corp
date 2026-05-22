import { cn } from "@/lib/utils"

type KanbanColumnHeaderProps = {
  title: string
  description?: string
  count: number
  countClassName?: string
  className?: string
}

export function KanbanColumnHeader({
  title,
  description,
  count,
  countClassName,
  className,
}: KanbanColumnHeaderProps) {
  return (
    <div className={cn("shrink-0 border-b-2 border-border px-4 py-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs tabular-nums",
            countClassName
          )}
        >
          {count}
        </span>
      </div>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}
