import { Columns3, Table2 } from "lucide-react";

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

      <TabsList className="h-11 w-auto shrink-0 gap-1">
        <TabsTrigger
          value="kanban"
          aria-label="Kanban Board"
          title="Kanban Board"
          className="size-8 px-0 py-0"
        >
          <Columns3 className="size-4" />
          <span className="sr-only">Kanban Board</span>
        </TabsTrigger>
        <TabsTrigger
          value="table"
          aria-label="Table View"
          title="Table View"
          className="size-8 px-0 py-0"
        >
          <Table2 className="size-4" />
          <span className="sr-only">Table View</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
