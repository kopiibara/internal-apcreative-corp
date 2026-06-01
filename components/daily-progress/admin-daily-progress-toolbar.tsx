import { FilePlus2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminDailyProgressToolbar({
  missedDate,
  recentDateOptions,
  isPending,
  canAddOwnReport,
  showOwnProgressForm,
  onMissedDateChange,
  onRunChecker,
  onToggleOwnProgressForm,
}: {
  missedDate: string;
  recentDateOptions: string[];
  isPending: boolean;
  canAddOwnReport: boolean;
  showOwnProgressForm: boolean;
  onMissedDateChange: (value: string) => void;
  onRunChecker: () => void;
  onToggleOwnProgressForm: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
      <div className="flex w-full min-w-0 flex-nowrap items-end gap-1.5 p-1 sm:w-auto sm:gap-2">
        <Select value={missedDate} onValueChange={onMissedDateChange}>
          <SelectTrigger
            className="h-9 min-w-0 flex-1 px-2 text-xs sm:w-44 sm:flex-none sm:text-sm"
            aria-label="Missed checker date"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {recentDateOptions.map((dateKey) => (
              <SelectItem key={dateKey} value={dateKey}>
                {dateKey}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="neutral"
          className="h-9 flex-1 gap-1 px-2 text-xs sm:flex-none sm:gap-2 sm:px-3 sm:text-sm"
          disabled={isPending}
          onClick={onRunChecker}
        >
          <Play className="size-4" />
          Run Checker
        </Button>

        {canAddOwnReport ? (
          <Button
            type="button"
            variant="default"
            className="h-9 flex-1 gap-1 px-2 text-xs sm:flex-none sm:gap-2 sm:px-3 sm:text-sm"
            onClick={onToggleOwnProgressForm}
          >
            <FilePlus2 className="size-4" />
            {showOwnProgressForm ? "Hide My Report" : "Add My Report"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
