"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"

import { ReminderFilters } from "@/components/to-do/reminder-filters"
import { ReminderFormDialog } from "@/components/to-do/reminder-form-dialog"
import { ReminderKanbanBoard } from "@/components/to-do/reminder-kanban-board"
import { BoardSection } from "@/components/shared/board-section"
import {
  KANBAN_BOARD_CONTENT_CLASS,
  KANBAN_BOARD_PAGE_CLASS,
  KANBAN_BOARD_SECTION_CLASS,
} from "@/components/shared/kanban-board-scroll"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { richTextToPlainText } from "@/lib/rich-text/rich-text"
import type { ReminderRecord } from "@/lib/reminders/reminders"
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
        richTextToPlainText(reminder.description)
          .toLowerCase()
          .includes(normalizedSearch)
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
    <div className={KANBAN_BOARD_PAGE_CLASS}>
      <BoardSection className={KANBAN_BOARD_SECTION_CLASS}>
        <CardHeader className="min-w-0 shrink-0 gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-card-foreground">Reminder board</CardTitle>
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Add Reminder
            </Button>
          </div>
          <ReminderFilters />
        </CardHeader>
        <CardContent className={KANBAN_BOARD_CONTENT_CLASS}>
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
