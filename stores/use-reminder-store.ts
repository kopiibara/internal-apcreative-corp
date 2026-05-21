"use client"

import { create } from "zustand"

import type {
  ReminderPriority,
  ReminderStatus,
} from "@/lib/reminder-statuses"
import type { ReminderRecord } from "@/lib/reminders"

type ReminderStore = {
  searchQuery: string
  selectedStatusFilter: ReminderStatus | "all"
  selectedPriorityFilter: ReminderPriority | "all"
  selectedDateRange: "all" | "today" | "upcoming" | "past"
  selectedReminder: ReminderRecord | null
  isCreateDialogOpen: boolean
  isEditDialogOpen: boolean
  setSearchQuery: (query: string) => void
  setSelectedStatusFilter: (status: ReminderStatus | "all") => void
  setSelectedPriorityFilter: (priority: ReminderPriority | "all") => void
  setSelectedDateRange: (dateRange: ReminderStore["selectedDateRange"]) => void
  openCreateDialog: () => void
  closeCreateDialog: () => void
  openEditDialog: (reminder: ReminderRecord) => void
  closeEditDialog: () => void
  resetReminderFilters: () => void
}

export const useReminderStore = create<ReminderStore>((set) => ({
  searchQuery: "",
  selectedStatusFilter: "all",
  selectedPriorityFilter: "all",
  selectedDateRange: "all",
  selectedReminder: null,
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedStatusFilter: (selectedStatusFilter) =>
    set({ selectedStatusFilter }),
  setSelectedPriorityFilter: (selectedPriorityFilter) =>
    set({ selectedPriorityFilter }),
  setSelectedDateRange: (selectedDateRange) => set({ selectedDateRange }),
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  openEditDialog: (selectedReminder) =>
    set({ selectedReminder, isEditDialogOpen: true }),
  closeEditDialog: () =>
    set({ selectedReminder: null, isEditDialogOpen: false }),
  resetReminderFilters: () =>
    set({
      searchQuery: "",
      selectedStatusFilter: "all",
      selectedPriorityFilter: "all",
      selectedDateRange: "all",
    }),
}))
