"use client"

import { create } from "zustand"

import type { ContentReport } from "@/types/content-report"

type ContentReportStore = {
  selectedContentReportId: number | null
  selectedContentReport: ContentReport | null
  isCreateDialogOpen: boolean
  isEditDialogOpen: boolean
  isDeleteDialogOpen: boolean
  isDetailsSheetOpen: boolean
  searchQuery: string
  selectedContentTypeFilter: string
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
  setSearchQuery: (query: string) => void
  setSelectedContentTypeFilter: (contentType: string) => void
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
  searchQuery: "",
  selectedContentTypeFilter: "all",
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
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedContentTypeFilter: (selectedContentTypeFilter) =>
    set({ selectedContentTypeFilter }),
  setSelectedSupervisorStatusFilter: (selectedSupervisorStatusFilter) =>
    set({ selectedSupervisorStatusFilter }),
  setSelectedDirectorStatusFilter: (selectedDirectorStatusFilter) =>
    set({ selectedDirectorStatusFilter }),
  setSelectedPublishStatusFilter: (selectedPublishStatusFilter) =>
    set({ selectedPublishStatusFilter }),
  resetContentReportFilters: () =>
    set({
      searchQuery: "",
      selectedContentTypeFilter: "all",
      selectedSupervisorStatusFilter: "all",
      selectedDirectorStatusFilter: "all",
      selectedPublishStatusFilter: "all",
    }),
}))
