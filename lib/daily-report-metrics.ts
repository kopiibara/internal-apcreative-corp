import {
  buildTaskPerformanceCounts,
  calculateTaskPerformancePoints,
  getTaskPointsFromCompletionRate,
} from "@/lib/performance-scoring"
import { isAssignmentCompletedOnTime } from "@/lib/task-type"

export type GradedAssignmentMetricInput = {
  status: string
  dueDate: string | null
  completedAt: string | null
}

export function computeSimpleCompletionRate(done: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((done / total) * 10000) / 100
}

export function computeApprovalRate(approved: number, total: number) {
  return computeSimpleCompletionRate(approved, total)
}

export function countGradedAssignmentMetrics(
  assignments: GradedAssignmentMetricInput[]
) {
  let done = 0
  let pending = 0
  let blockers = 0
  let revisions = 0
  let completedOnTime = 0
  let completedLate = 0

  for (const assignment of assignments) {
    if (assignment.status === "DONE") {
      done += 1
      const onTime = isAssignmentCompletedOnTime(
        assignment.completedAt,
        assignment.dueDate
      )

      if (onTime === true) {
        completedOnTime += 1
      } else if (onTime === false) {
        completedLate += 1
      }
    } else if (assignment.status === "BLOCKER") {
      blockers += 1
      pending += 1
    } else if (assignment.status === "REVISION") {
      revisions += 1
      pending += 1
    } else {
      pending += 1
    }
  }

  const total = assignments.length
  const performance = calculateTaskPerformancePoints(
    buildTaskPerformanceCounts({
      totalAssignedTasks: total,
      completedOnTimeTasks: completedOnTime,
      completedLateTasks: completedLate,
    })
  )

  return {
    total,
    done,
    pending,
    blockers,
    revisions,
    completionRate: computeSimpleCompletionRate(done, total),
    adjustedCompletionRate: performance.adjustedCompletionRate,
    taskPoints: performance.taskPoints,
    completedOnTime,
    completedLate,
  }
}

export function getGradedTaskPointsFromRate(completionRate: number) {
  return getTaskPointsFromCompletionRate(completionRate)
}

export function isContentReportFullyApproved(
  supervisorStatus: string,
  directorStatus: string
) {
  return supervisorStatus === "Approved" && directorStatus === "Approved"
}

export function isContentReportPending(
  supervisorStatus: string,
  directorStatus: string
) {
  return !isContentReportFullyApproved(supervisorStatus, directorStatus)
}
