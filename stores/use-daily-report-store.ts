"use client"

import { create } from "zustand"

import {
  ALL_BRANDS_FILTER,
  ALL_EMPLOYEES_FILTER,
  getTodayDateKeyInPhilippines,
} from "@/lib/daily-report-filters"

type DailyReportStore = {
  selectedDate: string
  selectedBrandId: string
  selectedEmployeeId: string
  searchQuery: string
  setSelectedDate: (date: string) => void
  setSelectedBrandId: (brandId: string) => void
  setSelectedEmployeeId: (employeeId: string) => void
  setSearchQuery: (query: string) => void
  resetDailyReportFilters: () => void
}

export const useDailyReportStore = create<DailyReportStore>((set) => ({
  selectedDate: getTodayDateKeyInPhilippines(),
  selectedBrandId: ALL_BRANDS_FILTER,
  selectedEmployeeId: ALL_EMPLOYEES_FILTER,
  searchQuery: "",
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedBrandId: (selectedBrandId) => set({ selectedBrandId }),
  setSelectedEmployeeId: (selectedEmployeeId) => set({ selectedEmployeeId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetDailyReportFilters: () =>
    set({
      selectedDate: getTodayDateKeyInPhilippines(),
      selectedBrandId: ALL_BRANDS_FILTER,
      selectedEmployeeId: ALL_EMPLOYEES_FILTER,
      searchQuery: "",
    }),
}))
