"use client";

import { useEffect } from "react";

import { getLiveTaskAssignments } from "@/app/admin/to-do/actions";
import type { TaskAssignmentRecord } from "@/lib/tasks/tasks";
import { useTaskStore } from "@/stores/use-task-store";

const TASK_BOARD_POLL_INTERVAL_MS = 5_000;

type UseTaskBoardSyncOptions = {
  assignments: TaskAssignmentRecord[];
  /** Poll server data so assignees see supervisor approvals without manual reload. */
  enablePolling?: boolean;
};

export function useTaskBoardSync({
  assignments,
  enablePolling = false,
}: UseTaskBoardSyncOptions) {
  const assignmentPatches = useTaskStore((state) => state.assignmentPatches);
  const clearAssignmentPatch = useTaskStore((state) => state.clearAssignmentPatch);
  const syncTaskAssignmentsFromServer = useTaskStore(
    (state) => state.syncTaskAssignmentsFromServer,
  );

  useEffect(() => {
    syncTaskAssignmentsFromServer(assignments);
  }, [assignments, syncTaskAssignmentsFromServer]);

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

    let cancelled = false;
    let isSyncing = false;

    const syncBoard = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (isSyncing) {
        return;
      }

      isSyncing = true;

      try {
        const result = await getLiveTaskAssignments();

        if (!cancelled && result.success && result.data?.assignments) {
          syncTaskAssignmentsFromServer(result.data.assignments);
        }
      } finally {
        isSyncing = false;
      }
    };

    syncBoard();

    const intervalId = window.setInterval(syncBoard, TASK_BOARD_POLL_INTERVAL_MS);

    window.addEventListener("visibilitychange", syncBoard);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", syncBoard);
    };
  }, [enablePolling, syncTaskAssignmentsFromServer]);
}
