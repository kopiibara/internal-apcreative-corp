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
  liveAssignments: TaskAssignmentRecord[] | null;
  assignmentPatches: Record<number, TaskAssignmentRecord>;
  setSearchQuery: (query: string) => void;
  syncTaskAssignmentsFromServer: (
    assignments: TaskAssignmentRecord[],
  ) => void;
  updateTaskAssignmentInStore: (assignment: TaskAssignmentRecord) => void;
  addTaskAssignmentsToStore: (assignments: TaskAssignmentRecord[]) => void;
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
  liveAssignments: null,
  assignmentPatches: {},
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  syncTaskAssignmentsFromServer: (assignments) =>
    set((state) => {
      const assignmentPatches = { ...state.assignmentPatches };

      for (const assignment of assignments) {
        const patch = assignmentPatches[assignment.assignmentId];

        if (
          patch &&
          (patch.status !== assignment.status ||
            patch.updatedAt !== assignment.updatedAt)
        ) {
          delete assignmentPatches[assignment.assignmentId];
        }
      }

      return {
        liveAssignments: assignments,
        assignmentPatches,
        selectedAssignment: state.selectedAssignment
          ? assignments.find(
              (assignment) =>
                assignment.assignmentId ===
                state.selectedAssignment?.assignmentId,
            ) ??
            assignmentPatches[state.selectedAssignment.assignmentId] ??
            state.selectedAssignment
          : null,
      };
    }),
  updateTaskAssignmentInStore: (assignment) =>
    set((state) => ({
      liveAssignments: state.liveAssignments
        ? state.liveAssignments.map((currentAssignment) =>
            currentAssignment.assignmentId === assignment.assignmentId
              ? assignment
              : currentAssignment,
          )
        : state.liveAssignments,
      assignmentPatches: {
        ...state.assignmentPatches,
        [assignment.assignmentId]: assignment,
      },
      selectedAssignment:
        state.selectedAssignment?.assignmentId === assignment.assignmentId
          ? assignment
          : state.selectedAssignment,
    })),
  addTaskAssignmentsToStore: (assignments) =>
    set((state) => {
      if (assignments.length === 0) {
        return {};
      }

      const nextById = new Map<number, TaskAssignmentRecord>();

      for (const assignment of state.liveAssignments ?? []) {
        nextById.set(assignment.assignmentId, assignment);
      }

      for (const assignment of assignments) {
        nextById.set(assignment.assignmentId, assignment);
      }

      return {
        liveAssignments: [...nextById.values()],
        assignmentPatches: {
          ...state.assignmentPatches,
          ...Object.fromEntries(
            assignments.map((assignment) => [
              assignment.assignmentId,
              assignment,
            ]),
          ),
        },
      };
    }),
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
