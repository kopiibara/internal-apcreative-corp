import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DailyProgressStatusBadgeProps = {
  label: string;
  tone?: "green" | "yellow" | "red" | "blue" | "neutral";
};

const toneClass = {
  green: "border-green-700 bg-green-600 text-white",
  yellow: "border-amber-600 bg-amber-500 text-white",
  red: "border-red-700 bg-red-600 text-white",
  blue: "border-cyan-700 bg-cyan-600 text-white",
  neutral: "border-border bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
};

export function DailyProgressStatusBadge({
  label,
  tone = "neutral",
}: DailyProgressStatusBadgeProps) {
  return (
    <Badge
      variant="status"
      className={cn("rounded-lg px-2 py-1 font-bold", toneClass[tone])}
    >
      {label}
    </Badge>
  );
}
