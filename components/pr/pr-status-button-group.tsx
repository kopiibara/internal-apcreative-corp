"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PRStatusButtonGroupProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  /** Label left, buttons right on one row (sm+). */
  layout?: "stacked" | "inline";
  /** Smaller buttons for table rows. */
  compact?: boolean;
  getOptionClassName?: (value: T, isActive: boolean) => string;
};

export function PRStatusButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className,
  layout = "stacked",
  compact = false,
  getOptionClassName,
}: PRStatusButtonGroupProps<T>) {
  const isInline = layout === "inline";
  const showLabel = Boolean(label.trim());

  return (
    <div
      className={cn(
        isInline
          ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          : compact
            ? "space-y-1"
            : "space-y-2",
        className,
      )}
    >
      {showLabel ? (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
            isInline && "shrink-0",
            compact && "text-[10px]",
          )}
        >
          {label}
        </p>
      ) : null}
      <div
        className={cn(
          "flex gap-1",
          compact ? "flex-nowrap" : "flex-wrap gap-2",
          isInline && "min-w-0 flex-1",
        )}
      >
        {options.map((option) => {
          const isActive = value === option.value;

          const colorClass = getOptionClassName?.(option.value, isActive);

          return (
            <Button
              key={option.value}
              type="button"
              size={compact ? "sm" : "sm"}
              variant={colorClass ? "noShadow" : isActive ? "default" : "neutral"}
              disabled={disabled}
              className={cn(
                "rounded-lg border-2",
                compact && "h-7 px-2 text-[11px] shadow-none",
                colorClass,
                !colorClass && isActive && !compact && "shadow-[var(--shadow-hard-sm)]",
                !colorClass && isActive && compact && "shadow-[var(--shadow-hard-sm)]",
              )}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
