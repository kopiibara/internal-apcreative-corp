"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { TaskAssignmentRecord } from "@/lib/tasks/tasks";
import { useTaskStore } from "@/stores/use-task-store";

const TASK_BOARD_POLL_INTERVAL_MS = 15_000;

type UseTaskBoardSyncOptions = {
  assignments: TaskAssignmentRecord[];
  /** Poll server data so assignees see supervisor approvals without manual reload. */
  enablePolling?: boolean;
};

export function useTaskBoardSync({
  assignments,
  enablePolling = false,
}: UseTaskBoardSyncOptions) {
  const router = useRouter();
  const assignmentPatches = useTaskStore((state) => state.assignmentPatches);
  const clearAssignmentPatch = useTaskStore((state) => state.clearAssignmentPatch);

  useEffect(() => {
    for (const assignment of assignments) {
      const patch = assignmentPatches[assignment.assignmentId];

      if (!patch) {
        continue;
      }

      if (
        patch.status !== assignment.status ||
        patch.updatedAt !== assignment.updatedAt
      ) {
        clearAssignmentPatch(assignment.assignmentId);
      }
    }
  }, [assignments, assignmentPatches, clearAssignmentPatch]);

  useEffect(() => {
    if (!enablePolling) {
      return;
    }

    const refreshBoard = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      router.refresh();
    };

    const intervalId = window.setInterval(
      refreshBoard,
      TASK_BOARD_POLL_INTERVAL_MS,
    );

    window.addEventListener("visibilitychange", refreshBoard);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", refreshBoard);
    };
  }, [enablePolling, router]);
}
