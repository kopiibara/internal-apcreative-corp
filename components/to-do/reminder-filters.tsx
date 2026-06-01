"use client"

import { RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getReminderStatusLabel,
  REMINDER_PRIORITIES,
  REMINDER_STATUSES,
} from "@/lib/reminders/reminder-statuses"
import { useReminderStore } from "@/stores/use-reminder-store"

export function ReminderFilters({ actions }: { actions?: React.ReactNode }) {
  const {
    searchQuery,
    selectedStatusFilter,
    selectedPriorityFilter,
    selectedDateRange,
    setSearchQuery,
    setSelectedStatusFilter,
    setSelectedPriorityFilter,
    setSelectedDateRange,
    resetReminderFilters,
  } = useReminderStore()

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedStatusFilter !== "all" ||
    selectedPriorityFilter !== "all" ||
    selectedDateRange !== "all"

  return (
    <ScrollArea className="w-full pb-1" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 p-1">
        <div className="relative w-[260px] max-w-[260px] md:w-[320px] md:max-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reminders..."
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={selectedStatusFilter}
          onValueChange={(value) =>
            setSelectedStatusFilter(value as typeof selectedStatusFilter)
          }
        >
          <SelectTrigger className="h-9 w-[150px] max-w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REMINDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getReminderStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedPriorityFilter}
          onValueChange={(value) =>
            setSelectedPriorityFilter(value as typeof selectedPriorityFilter)
          }
        >
          <SelectTrigger className="h-9 w-[150px] max-w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {REMINDER_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedDateRange}
          onValueChange={(value) =>
            setSelectedDateRange(value as typeof selectedDateRange)
          }
        >
          <SelectTrigger className="h-9 w-[150px] max-w-[150px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past due</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="neutral"
            size="sm"
            className="h-9 whitespace-nowrap"
            onClick={resetReminderFilters}
          >
            <RotateCcw className="size-4" />
            Reset Filters
          </Button>
        ) : null}

        {actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
            {actions}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  )
}
