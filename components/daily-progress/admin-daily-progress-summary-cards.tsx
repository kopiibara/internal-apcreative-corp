import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card
      className={cn(
        "min-h-[74px] min-w-0 justify-between overflow-hidden px-0 py-2 sm:min-h-[120px] sm:py-3 md:min-h-[190px] md:py-4",
        tone,
      )}
    >
      <CardHeader className="px-2 pb-1 sm:px-4 sm:pb-2">
        <CardTitle className="text-[0.55rem] font-bold uppercase leading-tight tracking-[0.08em] sm:text-[0.65rem] sm:tracking-[0.12em] md:text-xs md:tracking-[0.16em]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 md:px-6">
        <h1 className="text-2xl font-black tabular-nums sm:text-4xl md:text-5xl">
          {value}
        </h1>
      </CardContent>
    </Card>
  );
}

export function AdminDailyProgressSummaryCards({
  requiredEmployees,
  submittedCount,
  latePendingCount,
  missedCount,
}: {
  requiredEmployees: number;
  submittedCount: number;
  latePendingCount: number;
  missedCount: number;
}) {
  return (
    <div className="grid grid-cols-4 shrink-0 gap-1.5 p-1 sm:gap-3 lg:grid-cols-4">
      <SummaryCard
        label="Required Staff"
        value={requiredEmployees}
        tone="bg-background text-foreground"
      />
      <SummaryCard
        label="Submitted"
        value={submittedCount}
        tone="bg-blue text-white"
      />
      <SummaryCard
        label="Late Pending"
        value={latePendingCount}
        tone="bg-cyan text-white"
      />
      <SummaryCard
        label="Missed"
        value={missedCount}
        tone="bg-magenta text-white"
      />
    </div>
  );
}
