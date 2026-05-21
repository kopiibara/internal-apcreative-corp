import type { TaskAssignmentRecord } from "@/lib/tasks"
import type { TaskAssignmentStatus, TaskPriority, TaskType } from "@/lib/task-type"

type FilterTaskAssignmentsInput = {
  assignments: TaskAssignmentRecord[]
  searchQuery: string
  statusFilter: TaskAssignmentStatus | "all"
  typeFilter: TaskType | "all"
  assigneeFilter: string
  priorityFilter: TaskPriority | "all"
}

export function filterTaskAssignments({
  assignments,
  searchQuery,
  statusFilter,
  typeFilter,
  assigneeFilter,
  priorityFilter,
}: FilterTaskAssignmentsInput) {
  const normalizedSearch = searchQuery.trim().toLowerCase()

  return assignments.filter((assignment) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      assignment.title.toLowerCase().includes(normalizedSearch) ||
      (assignment.description ?? "").toLowerCase().includes(normalizedSearch) ||
      assignment.assignedToName.toLowerCase().includes(normalizedSearch) ||
      assignment.createdByName.toLowerCase().includes(normalizedSearch)
    const matchesStatus =
      statusFilter === "all" || assignment.status === statusFilter
    const matchesType =
      typeFilter === "all" || assignment.taskType === typeFilter
    const matchesAssignee =
      assigneeFilter === "all" ||
      String(assignment.assignedToProfileId) === assigneeFilter
    const matchesPriority =
      priorityFilter === "all" || assignment.priority === priorityFilter

    return (
      matchesSearch &&
      matchesStatus &&
      matchesType &&
      matchesAssignee &&
      matchesPriority
    )
  })
}
