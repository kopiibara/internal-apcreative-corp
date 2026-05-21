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
import type { AssignableProfile } from "@/lib/tasks"
import {
  TASK_ASSIGNMENT_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from "@/lib/task-type"
import { getTaskStatusLabel } from "@/lib/task-statuses"
import { useTaskStore } from "@/stores/use-task-store"

type TaskFiltersProps = {
  assignees?: AssignableProfile[]
  showAssigneeFilter?: boolean
}

export function TaskFilters({
  assignees = [],
  showAssigneeFilter = true,
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

  return (
    <ScrollArea className="w-full pb-2" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 pr-3">
        <div className="relative min-w-[260px] md:min-w-[320px]">
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
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
            <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 whitespace-nowrap"
          onClick={resetTaskFilters}
        >
          <RotateCcw className="size-4" />
          Reset Filters
        </Button>
      </div>
    </ScrollArea>
  )
}
