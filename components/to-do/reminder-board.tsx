"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"

import { ReminderFilters } from "@/components/to-do/reminder-filters"
import { ReminderFormDialog } from "@/components/to-do/reminder-form-dialog"
import { ReminderKanbanBoard } from "@/components/to-do/reminder-kanban-board"
import { BoardSection } from "@/components/shared/board-section"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReminderRecord } from "@/lib/reminders"
import { useReminderStore } from "@/stores/use-reminder-store"

type ReminderBoardProps = {
  reminders: ReminderRecord[]
}

function matchesDateRange(reminder: ReminderRecord, dateRange: string) {
  if (dateRange === "all") {
    return true
  }

  if (!reminder.remindAt) {
    return false
  }

  const reminderDate = new Date(reminder.remindAt)
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  if (dateRange === "today") {
    return reminderDate >= startOfToday && reminderDate <= endOfToday
  }

  if (dateRange === "upcoming") {
    return reminderDate > now
  }

  if (dateRange === "past") {
    return reminderDate <= now
  }

  return true
}

export function ReminderBoard({ reminders }: ReminderBoardProps) {
  const {
    searchQuery,
    selectedStatusFilter,
    selectedPriorityFilter,
    selectedDateRange,
    selectedReminder,
    isCreateDialogOpen,
    isEditDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    closeEditDialog,
  } = useReminderStore()

  const filteredReminders = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return reminders.filter((reminder) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        reminder.title.toLowerCase().includes(normalizedSearch) ||
        (reminder.description ?? "").toLowerCase().includes(normalizedSearch)
      const matchesStatus =
        selectedStatusFilter === "all" ||
        reminder.status === selectedStatusFilter
      const matchesPriority =
        selectedPriorityFilter === "all" ||
        reminder.priority === selectedPriorityFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesDateRange(reminder, selectedDateRange)
      )
    })
  }, [
    reminders,
    searchQuery,
    selectedDateRange,
    selectedPriorityFilter,
    selectedStatusFilter,
  ])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Reminder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personal reminders for follow-ups and deadlines.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Reminder
        </Button>
      </div>

      <BoardSection className="w-full min-w-0 overflow-hidden pb-1 gap-2">
        <CardHeader className="min-w-0 shrink-0 gap-3">
          <CardTitle className="text-card-foreground">Reminder board</CardTitle>
          <ReminderFilters />
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden px-0 pb-0">
          <ReminderKanbanBoard reminders={filteredReminders} />
        </CardContent>
      </BoardSection>

      <ReminderFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateDialog()
          }
        }}
      />

      <ReminderFormDialog
        key={selectedReminder?.id ?? "edit-reminder"}
        reminder={selectedReminder}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog()
          }
        }}
      />
    </div>
  )
}
