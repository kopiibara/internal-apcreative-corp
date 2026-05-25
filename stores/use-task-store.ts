"use client";

import { create } from "zustand";

import type { TaskAssignmentRecord } from "@/lib/tasks/tasks";
import type {
  TaskAssignmentStatus,
  TaskPriority,
  TaskType,
} from "@/lib/tasks/task-type";

type TaskStore = {
  searchQuery: string;
  selectedStatusFilter: TaskAssignmentStatus | "all";
  selectedTypeFilter: TaskType | "all";
  selectedAssigneeFilter: string;
  selectedPriorityFilter: TaskPriority | "all";
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  selectedAssignment: TaskAssignmentRecord | null;
  assignmentPatches: Record<number, TaskAssignmentRecord>;
  setSearchQuery: (query: string) => void;
  updateTaskAssignmentInStore: (assignment: TaskAssignmentRecord) => void;
  clearAssignmentPatch: (assignmentId: number) => void;
  setSelectedStatusFilter: (status: TaskAssignmentStatus | "all") => void;
  setSelectedTypeFilter: (type: TaskType | "all") => void;
  setSelectedAssigneeFilter: (assigneeId: string) => void;
  setSelectedPriorityFilter: (priority: TaskPriority | "all") => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (assignment: TaskAssignmentRecord) => void;
  closeEditDialog: () => void;
  resetTaskFilters: () => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  searchQuery: "",
  selectedStatusFilter: "all",
  selectedTypeFilter: "all",
  selectedAssigneeFilter: "all",
  selectedPriorityFilter: "all",
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  selectedAssignment: null,
  assignmentPatches: {},
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  updateTaskAssignmentInStore: (assignment) =>
    set((state) => ({
      assignmentPatches: {
        ...state.assignmentPatches,
        [assignment.assignmentId]: assignment,
      },
      selectedAssignment:
        state.selectedAssignment?.assignmentId === assignment.assignmentId
          ? assignment
          : state.selectedAssignment,
    })),
  clearAssignmentPatch: (assignmentId) =>
    set((state) => {
      const assignmentPatches = { ...state.assignmentPatches };
      delete assignmentPatches[assignmentId];
      return { assignmentPatches };
    }),
  setSelectedStatusFilter: (selectedStatusFilter) =>
    set({ selectedStatusFilter }),
  setSelectedTypeFilter: (selectedTypeFilter) => set({ selectedTypeFilter }),
  setSelectedAssigneeFilter: (selectedAssigneeFilter) =>
    set({ selectedAssigneeFilter }),
  setSelectedPriorityFilter: (selectedPriorityFilter) =>
    set({ selectedPriorityFilter }),
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  openEditDialog: (selectedAssignment) =>
    set({ selectedAssignment, isEditDialogOpen: true }),
  closeEditDialog: () =>
    set({ selectedAssignment: null, isEditDialogOpen: false }),
  resetTaskFilters: () =>
    set({
      searchQuery: "",
      selectedStatusFilter: "all",
      selectedTypeFilter: "all",
      selectedAssigneeFilter: "all",
      selectedPriorityFilter: "all",
    }),
}));
