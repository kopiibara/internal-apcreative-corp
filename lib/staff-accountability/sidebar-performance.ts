import "server-only"

import { getStaffAccountabilitySummaries } from "@/lib/tasks/tasks"

export type SidebarPerformanceSummary = {
  rank: number
  rankLabel: string
  totalPoints: number
  taskPoints: number
  grossTaskPoints: number
  lateTaskDeductionPoints: number
  dailyProgressNetPoints: number
  dailyProgressPoints: number
  dailyProgressDeductions: number
}

export async function getSidebarPerformanceSummary(profileId: number) {
  try {
    const summaries = await getStaffAccountabilitySummaries()
    const summary = summaries.find((item) => item.profileId === profileId)

    if (!summary) {
      return null
    }

    return {
      rank: summary.rank,
      rankLabel: summary.rankLabel,
      totalPoints: summary.totalPoints,
      taskPoints: summary.taskPoints,
      grossTaskPoints: summary.grossTaskPoints,
      lateTaskDeductionPoints: summary.lateTaskDeductionPoints,
      dailyProgressNetPoints: summary.dailyProgressNetPoints,
      dailyProgressPoints: summary.dailyProgressPoints,
      dailyProgressDeductions: summary.dailyProgressDeductions,
    } satisfies SidebarPerformanceSummary
  } catch (error) {
    console.error("Failed to load sidebar performance summary", error)
    return null
  }
}
