import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DailyProgressStatusBadgeProps = {
  label: string;
  tone?: "green" | "yellow" | "red" | "blue" | "neutral";
};

const toneClass = {
  green: "border-green-700 bg-green-100 text-green-900",
  yellow: "border-yellow-700 bg-yellow-100 text-yellow-950",
  red: "border-red-700 bg-red-100 text-red-900",
  blue: "border-blue bg-cyan/20 text-blue",
  neutral: "border-border bg-background text-foreground",
};

export function DailyProgressStatusBadge({
  label,
  tone = "neutral",
}: DailyProgressStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-lg border-2 px-2 py-1 font-bold", toneClass[tone])}
    >
      {label}
    </Badge>
  );
}
