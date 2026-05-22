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
} from "@/lib/reminder-statuses"
import { useReminderStore } from "@/stores/use-reminder-store"

export function ReminderFilters() {
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

  return (
    <ScrollArea className="w-full pb-2" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 pr-3">
        <div className="relative min-w-[260px] md:min-w-[320px]">
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
          <SelectTrigger className="h-9 min-w-[150px]">
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
          <SelectTrigger className="h-9 min-w-[150px]">
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
          <SelectTrigger className="h-9 min-w-[150px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past due</SelectItem>
          </SelectContent>
        </Select>

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
      </div>
    </ScrollArea>
  )
}
