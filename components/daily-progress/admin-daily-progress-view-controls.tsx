import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DailyProgressStatusFilter } from "@/types/admin-daily-progress-types";

export function AdminDailyProgressViewControls({
  activeView,
  employeeFilter,
  statusFilter,
  dateFilter,
  employeeOptions,
  reportDateOptions,
  boardDate,
  onEmployeeFilterChange,
  onStatusFilterChange,
  onDateFilterChange,
}: {
  activeView: "kanban" | "table";
  employeeFilter: string;
  statusFilter: DailyProgressStatusFilter;
  dateFilter: string;
  employeeOptions: [number, string][];
  reportDateOptions: string[];
  boardDate: string;
  onEmployeeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: DailyProgressStatusFilter) => void;
  onDateFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 p-1">
      <TabsList className="h-fit w-auto shrink-0 ">
        <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
        <TabsTrigger value="table">Table View</TabsTrigger>
      </TabsList>

      <Select value={employeeFilter} onValueChange={onEmployeeFilterChange}>
        <SelectTrigger
          className="h-9 w-[11rem]"
          aria-label="Filter by employee"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All staff</SelectItem>
          {employeeOptions.map(([profileId, employeeName]) => (
            <SelectItem key={profileId} value={String(profileId)}>
              {employeeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          onStatusFilterChange(value as DailyProgressStatusFilter)
        }
      >
        <SelectTrigger className="h-9 w-[10.5rem]" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="Submitted">Submitted</SelectItem>
          <SelectItem value="Late Pending">Late Pending</SelectItem>
          <SelectItem value="Missed">Missed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={dateFilter} onValueChange={onDateFilterChange}>
        <SelectTrigger className="h-9 w-[11.5rem]" aria-label="Filter by date">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {activeView === "table" ? (
            <SelectItem value="all">All loaded dates</SelectItem>
          ) : null}
          {reportDateOptions.map((dateKey) => (
            <SelectItem key={dateKey} value={dateKey}>
              {dateKey}
              {dateKey === boardDate ? " (today)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
