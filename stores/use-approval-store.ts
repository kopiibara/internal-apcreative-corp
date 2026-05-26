"use client";

import { create } from "zustand";

import { pruneSyncedApprovalPatches } from "@/lib/approvals/approval-filters";
import type {
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";
import type { ContentReport } from "@/types/content-report";

export type ApprovalVerificationPayload =
  | {
      type: "supervisor";
      report: ContentReport;
      supervisorStatus: ReviewStatus;
      notes: string;
      onSaved?: (updatedApproval?: ContentReport) => void;
      onCancelled?: () => void;
    }
  | {
      type: "director";
      report: ContentReport;
      directorStatus: ReviewStatus;
      notes: string;
      onSaved?: (updatedApproval?: ContentReport) => void;
      onCancelled?: () => void;
    }
  | {
      type: "publishing";
      report: ContentReport;
      publishStatus: PublishStatus;
      scheduledPublishedDate: string | null;
      proofUrl?: string | null;
      notes: string;
      onSaved?: (updatedApproval?: ContentReport) => void;
      onCancelled?: () => void;
    }
  | {
      type: "kanban";
      report: ContentReport;
      fromColumn: string;
      toColumn: string;
      notes: string;
      onSaved?: (updatedApproval?: ContentReport) => void;
      onCancelled?: () => void;
    };

export type PendingKanbanMove = Extract<
  ApprovalVerificationPayload,
  { type: "kanban" }
>;

type ApprovalStore = {
  selectedApprovalId: number | null;
  selectedApproval: ContentReport | null;
  verificationPayload: ApprovalVerificationPayload | null;
  pendingKanbanMove: PendingKanbanMove | null;
  selectedFromColumn: string | null;
  selectedToColumn: string | null;
  activeView: "kanban" | "table";
  searchQuery: string;
  selectedBrandFilter: string;
  selectedContentTypeFilter: string;
  selectedPlatformFilter: string;
  selectedStatusFilter: string;
  selectedSupervisorStatusFilter: string;
  selectedDirectorStatusFilter: string;
  selectedPublishStatusFilter: string;
  selectedDateRange: string;
  isSupervisorReviewDialogOpen: boolean;
  isDirectorReviewDialogOpen: boolean;
  isPublishingDialogOpen: boolean;
  isDetailsSheetOpen: boolean;
  isVerificationDialogOpen: boolean;
  openDetailsSheet: (approval: ContentReport) => void;
  closeDetailsSheet: () => void;
  openVerificationDialog: (payload: ApprovalVerificationPayload) => void;
  closeVerificationDialog: () => void;
  setPendingKanbanMove: (payload: PendingKanbanMove) => void;
  clearPendingKanbanMove: () => void;
  setActiveView: (view: "kanban" | "table") => void;
  openSupervisorReviewDialog: (approval: ContentReport) => void;
  closeSupervisorReviewDialog: () => void;
  openDirectorReviewDialog: (approval: ContentReport) => void;
  closeDirectorReviewDialog: () => void;
  openPublishingDialog: (approval: ContentReport) => void;
  closePublishingDialog: () => void;
  approvalPatches: Record<number, ContentReport>;
  setSelectedApproval: (approval: ContentReport | null) => void;
  updateApprovalInStore: (approval: ContentReport) => void;
  reconcileApprovalPatches: (reports: ContentReport[]) => void;
  clearApprovalPatch: (approvalId: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedBrandFilter: (brand: string) => void;
  setSelectedContentTypeFilter: (contentType: string) => void;
  setSelectedPlatformFilter: (platform: string) => void;
  setSelectedStatusFilter: (status: string) => void;
  setSelectedSupervisorStatusFilter: (status: string) => void;
  setSelectedDirectorStatusFilter: (status: string) => void;
  setSelectedPublishStatusFilter: (status: string) => void;
  setSelectedDateRange: (dateRange: string) => void;
  resetApprovalFilters: () => void;
};

const clearSelection = {
  selectedApprovalId: null,
  selectedApproval: null,
};

export const useApprovalStore = create<ApprovalStore>((set) => ({
  selectedApprovalId: null,
  selectedApproval: null,
  approvalPatches: {},
  verificationPayload: null,
  pendingKanbanMove: null,
  selectedFromColumn: null,
  selectedToColumn: null,
  activeView: "kanban",
  searchQuery: "",
  selectedBrandFilter: "all",
  selectedContentTypeFilter: "all",
  selectedPlatformFilter: "all",
  selectedStatusFilter: "all",
  selectedSupervisorStatusFilter: "all",
  selectedDirectorStatusFilter: "all",
  selectedPublishStatusFilter: "all",
  selectedDateRange: "all",
  isSupervisorReviewDialogOpen: false,
  isDirectorReviewDialogOpen: false,
  isPublishingDialogOpen: false,
  isDetailsSheetOpen: false,
  isVerificationDialogOpen: false,
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
  openVerificationDialog: (verificationPayload) =>
    set({
      selectedApprovalId: verificationPayload.report.id,
      selectedApproval: verificationPayload.report,
      verificationPayload,
      pendingKanbanMove:
        verificationPayload.type === "kanban" ? verificationPayload : null,
      selectedFromColumn:
        verificationPayload.type === "kanban"
          ? verificationPayload.fromColumn
          : null,
      selectedToColumn:
        verificationPayload.type === "kanban"
          ? verificationPayload.toColumn
          : null,
      isVerificationDialogOpen: true,
    }),
  closeVerificationDialog: () =>
    set({
      verificationPayload: null,
      pendingKanbanMove: null,
      selectedFromColumn: null,
      selectedToColumn: null,
      isVerificationDialogOpen: false,
    }),
  setPendingKanbanMove: (pendingKanbanMove) =>
    set({
      pendingKanbanMove,
      selectedFromColumn: pendingKanbanMove.fromColumn,
      selectedToColumn: pendingKanbanMove.toColumn,
    }),
  clearPendingKanbanMove: () =>
    set({
      pendingKanbanMove: null,
      selectedFromColumn: null,
      selectedToColumn: null,
    }),
  setActiveView: (activeView) => set({ activeView }),
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
  updateApprovalInStore: (approval) =>
    set((state) => ({
      approvalPatches: {
        ...state.approvalPatches,
        [approval.id]: approval,
      },
      selectedApprovalId:
        state.selectedApprovalId === approval.id
          ? approval.id
          : state.selectedApprovalId,
      selectedApproval:
        state.selectedApprovalId === approval.id
          ? approval
          : state.selectedApproval,
    })),
  reconcileApprovalPatches: (reports) =>
    set((state) => ({
      approvalPatches: pruneSyncedApprovalPatches(
        reports,
        state.approvalPatches,
      ),
    })),
  clearApprovalPatch: (approvalId) =>
    set((state) => {
      const approvalPatches = { ...state.approvalPatches };
      delete approvalPatches[approvalId];
      return { approvalPatches };
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedBrandFilter: (selectedBrandFilter) => set({ selectedBrandFilter }),
  setSelectedContentTypeFilter: (selectedContentTypeFilter) =>
    set({ selectedContentTypeFilter }),
  setSelectedPlatformFilter: (selectedPlatformFilter) =>
    set({ selectedPlatformFilter }),
  setSelectedStatusFilter: (selectedStatusFilter) =>
    set({ selectedStatusFilter }),
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
      selectedBrandFilter: "all",
      selectedContentTypeFilter: "all",
      selectedPlatformFilter: "all",
      selectedStatusFilter: "all",
      selectedSupervisorStatusFilter: "all",
      selectedDirectorStatusFilter: "all",
      selectedPublishStatusFilter: "all",
      selectedDateRange: "all",
    }),
}));
