"use client"

import { create } from "zustand"

import type { ContentReport } from "@/types/content-report"

type ApprovalStore = {
  selectedApprovalId: number | null
  selectedApproval: ContentReport | null
  searchQuery: string
  selectedContentTypeFilter: string
  selectedSupervisorStatusFilter: string
  selectedDirectorStatusFilter: string
  selectedPublishStatusFilter: string
  selectedDateRange: string
  isSupervisorReviewDialogOpen: boolean
  isDirectorReviewDialogOpen: boolean
  isPublishingDialogOpen: boolean
  isDetailsSheetOpen: boolean
  openDetailsSheet: (approval: ContentReport) => void
  closeDetailsSheet: () => void
  openSupervisorReviewDialog: (approval: ContentReport) => void
  closeSupervisorReviewDialog: () => void
  openDirectorReviewDialog: (approval: ContentReport) => void
  closeDirectorReviewDialog: () => void
  openPublishingDialog: (approval: ContentReport) => void
  closePublishingDialog: () => void
  setSelectedApproval: (approval: ContentReport | null) => void
  setSearchQuery: (query: string) => void
  setSelectedContentTypeFilter: (contentType: string) => void
  setSelectedSupervisorStatusFilter: (status: string) => void
  setSelectedDirectorStatusFilter: (status: string) => void
  setSelectedPublishStatusFilter: (status: string) => void
  setSelectedDateRange: (dateRange: string) => void
  resetApprovalFilters: () => void
}

const clearSelection = {
  selectedApprovalId: null,
  selectedApproval: null,
}

export const useApprovalStore = create<ApprovalStore>((set) => ({
  selectedApprovalId: null,
  selectedApproval: null,
  searchQuery: "",
  selectedContentTypeFilter: "all",
  selectedSupervisorStatusFilter: "all",
  selectedDirectorStatusFilter: "all",
  selectedPublishStatusFilter: "all",
  selectedDateRange: "all",
  isSupervisorReviewDialogOpen: false,
  isDirectorReviewDialogOpen: false,
  isPublishingDialogOpen: false,
  isDetailsSheetOpen: false,
  openDetailsSheet: (approval) =>
    set({
      selectedApprovalId: approval.id,
      selectedApproval: approval,
      isDetailsSheetOpen: true,
    }),
  closeDetailsSheet: () =>
    set({
      ...clearSelection,
      isDetailsSheetOpen: false,
    }),
  openSupervisorReviewDialog: (approval) =>
    set({
      selectedApprovalId: approval.id,
      selectedApproval: approval,
      isSupervisorReviewDialogOpen: true,
    }),
  closeSupervisorReviewDialog: () =>
    set({
      ...clearSelection,
      isSupervisorReviewDialogOpen: false,
    }),
  openDirectorReviewDialog: (approval) =>
    set({
      selectedApprovalId: approval.id,
      selectedApproval: approval,
      isDirectorReviewDialogOpen: true,
    }),
  closeDirectorReviewDialog: () =>
    set({
      ...clearSelection,
      isDirectorReviewDialogOpen: false,
    }),
  openPublishingDialog: (approval) =>
    set({
      selectedApprovalId: approval.id,
      selectedApproval: approval,
      isPublishingDialogOpen: true,
    }),
  closePublishingDialog: () =>
    set({
      ...clearSelection,
      isPublishingDialogOpen: false,
    }),
  setSelectedApproval: (approval) =>
    set({
      selectedApprovalId: approval?.id ?? null,
      selectedApproval: approval,
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
  setSelectedDateRange: (selectedDateRange) => set({ selectedDateRange }),
  resetApprovalFilters: () =>
    set({
      searchQuery: "",
      selectedContentTypeFilter: "all",
      selectedSupervisorStatusFilter: "all",
      selectedDirectorStatusFilter: "all",
      selectedPublishStatusFilter: "all",
      selectedDateRange: "all",
    }),
}))
