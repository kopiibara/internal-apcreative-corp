"use client"

import { create } from "zustand"

import type { ContentReport } from "@/types/content-report"

export type EmployeeApprovalView = "kanban" | "table"

type ContentReportStore = {
  selectedContentReportId: number | null
  selectedContentReport: ContentReport | null
  isCreateDialogOpen: boolean
  isEditDialogOpen: boolean
  isDeleteDialogOpen: boolean
  isDetailsSheetOpen: boolean
  activeView: EmployeeApprovalView
  searchQuery: string
  selectedBrandFilter: string
  selectedContentTypeFilter: string
  selectedPlatformFilter: string
  selectedSupervisorStatusFilter: string
  selectedDirectorStatusFilter: string
  selectedPublishStatusFilter: string
  openCreateDialog: () => void
  closeCreateDialog: () => void
  openEditDialog: (report: ContentReport) => void
  closeEditDialog: () => void
  openDeleteDialog: (report: ContentReport) => void
  closeDeleteDialog: () => void
  openDetailsSheet: (report: ContentReport) => void
  closeDetailsSheet: () => void
  setSelectedContentReport: (report: ContentReport | null) => void
  setActiveView: (view: EmployeeApprovalView) => void
  setSearchQuery: (query: string) => void
  setSelectedBrandFilter: (brand: string) => void
  setSelectedContentTypeFilter: (contentType: string) => void
  setSelectedPlatformFilter: (platform: string) => void
  setSelectedSupervisorStatusFilter: (status: string) => void
  setSelectedDirectorStatusFilter: (status: string) => void
  setSelectedPublishStatusFilter: (status: string) => void
  resetContentReportFilters: () => void
}

export const useContentReportStore = create<ContentReportStore>((set) => ({
  selectedContentReportId: null,
  selectedContentReport: null,
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  isDeleteDialogOpen: false,
  isDetailsSheetOpen: false,
  activeView: "kanban",
  searchQuery: "",
  selectedBrandFilter: "all",
  selectedContentTypeFilter: "all",
  selectedPlatformFilter: "all",
  selectedSupervisorStatusFilter: "all",
  selectedDirectorStatusFilter: "all",
  selectedPublishStatusFilter: "all",
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  openEditDialog: (report) =>
    set({
      selectedContentReportId: report.id,
      selectedContentReport: report,
      isEditDialogOpen: true,
    }),
  closeEditDialog: () =>
    set({
      selectedContentReportId: null,
      selectedContentReport: null,
      isEditDialogOpen: false,
    }),
  openDeleteDialog: (report) =>
    set({
      selectedContentReportId: report.id,
      selectedContentReport: report,
      isDeleteDialogOpen: true,
    }),
  closeDeleteDialog: () =>
    set({
      selectedContentReportId: null,
      selectedContentReport: null,
      isDeleteDialogOpen: false,
    }),
  openDetailsSheet: (report) =>
    set({
      selectedContentReportId: report.id,
      selectedContentReport: report,
      isDetailsSheetOpen: true,
    }),
  closeDetailsSheet: () =>
    set({
      selectedContentReportId: null,
      selectedContentReport: null,
      isDetailsSheetOpen: false,
    }),
  setSelectedContentReport: (report) =>
    set({
      selectedContentReportId: report?.id ?? null,
      selectedContentReport: report,
    }),
  setActiveView: (activeView) => set({ activeView }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedBrandFilter: (selectedBrandFilter) => set({ selectedBrandFilter }),
  setSelectedContentTypeFilter: (selectedContentTypeFilter) =>
    set({ selectedContentTypeFilter }),
  setSelectedPlatformFilter: (selectedPlatformFilter) =>
    set({ selectedPlatformFilter }),
  setSelectedSupervisorStatusFilter: (selectedSupervisorStatusFilter) =>
    set({ selectedSupervisorStatusFilter }),
  setSelectedDirectorStatusFilter: (selectedDirectorStatusFilter) =>
    set({ selectedDirectorStatusFilter }),
  setSelectedPublishStatusFilter: (selectedPublishStatusFilter) =>
    set({ selectedPublishStatusFilter }),
  resetContentReportFilters: () =>
    set({
      searchQuery: "",
      selectedBrandFilter: "all",
      selectedContentTypeFilter: "all",
      selectedPlatformFilter: "all",
      selectedSupervisorStatusFilter: "all",
      selectedDirectorStatusFilter: "all",
      selectedPublishStatusFilter: "all",
    }),
}))
