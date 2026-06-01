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
import type { AssignableProfile } from "@/lib/tasks/tasks"
import {
  TASK_ASSIGNMENT_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from "@/lib/tasks/task-type"
import { getTaskStatusLabel } from "@/lib/tasks/task-statuses"
import { useTaskStore } from "@/stores/use-task-store"

type TaskFiltersProps = {
  assignees?: AssignableProfile[]
  showAssigneeFilter?: boolean
  actions?: React.ReactNode
}

export function TaskFilters({
  assignees = [],
  showAssigneeFilter = true,
  actions,
}: TaskFiltersProps) {
  const {
    searchQuery,
    selectedStatusFilter,
    selectedTypeFilter,
    selectedAssigneeFilter,
    selectedPriorityFilter,
    setSearchQuery,
    setSelectedStatusFilter,
    setSelectedTypeFilter,
    setSelectedAssigneeFilter,
    setSelectedPriorityFilter,
    resetTaskFilters,
  } = useTaskStore()

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedStatusFilter !== "all" ||
    selectedTypeFilter !== "all" ||
    selectedAssigneeFilter !== "all" ||
    selectedPriorityFilter !== "all"

  return (
    <ScrollArea className="w-full pb-1" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 p-1">
        <div className="relative w-[260px] max-w-[260px] md:w-[320px] md:max-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tasks..."
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={selectedStatusFilter}
          onValueChange={(value) =>
            setSelectedStatusFilter(value as typeof selectedStatusFilter)
          }
        >
          <SelectTrigger className="h-9 w-fit">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_ASSIGNMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getTaskStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTypeFilter}
          onValueChange={(value) =>
            setSelectedTypeFilter(value as typeof selectedTypeFilter)
          }
        >
          <SelectTrigger className="h-9 w-fit">
            <SelectValue placeholder="Task type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TASK_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "GRADED" ? "Graded" : "Personal"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showAssigneeFilter && assignees.length > 0 ? (
          <Select
            value={selectedAssigneeFilter}
            onValueChange={setSelectedAssigneeFilter}
          >
            <SelectTrigger className="h-9 w-fit">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={String(assignee.id)}>
                  {assignee.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={selectedPriorityFilter}
          onValueChange={(value) =>
            setSelectedPriorityFilter(value as typeof selectedPriorityFilter)
          }
        >
          <SelectTrigger className="h-9 w-fit">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TASK_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="neutral"
            size="sm"
            className="h-9 whitespace-nowrap"
            onClick={resetTaskFilters}
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
