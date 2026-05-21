"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"

export type StaffAccountabilitySummary = {
  profileId: number
  fullName: string
  email: string
  accountType: string
  totalAssignedTasks: number
  completedOnTimeTasks: number
  completedLateTasks: number
  notCompletedTasks: number
  adjustedCompletionRate: number
  taskPoints: number
}

type StaffAccountabilityDashboardProps = {
  summaries: StaffAccountabilitySummary[]
}

export function StaffAccountabilityDashboard({
  summaries,
}: StaffAccountabilityDashboardProps) {
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">
          Staff Accountability
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Graded task completion performance for active employees.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Task performance</CardTitle>
            <CardDescription>
              Only graded assigned tasks are included in scoring.
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md border"
                  aria-label="Scoring help"
                >
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Completed on time gets full credit, completed late gets partial
                credit, and incomplete tasks get no credit.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full" scrollbars="horizontal">
            <div className="min-w-[960px]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium">Employee</th>
                    <th className="px-3 py-2 font-medium">Assigned</th>
                    <th className="px-3 py-2 font-medium">On Time</th>
                    <th className="px-3 py-2 font-medium">Late</th>
                    <th className="px-3 py-2 font-medium">Not Completed</th>
                    <th className="px-3 py-2 font-medium">Adjusted Rate</th>
                    <th className="px-3 py-2 font-medium">Task Points</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-muted-foreground"
                      >
                        No active employees found.
                      </td>
                    </tr>
                  ) : (
                    summaries.map((summary) => (
                      <tr key={summary.profileId} className="border-b">
                        <td className="px-3 py-3">
                          <div className="font-medium">{summary.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {summary.email}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {summary.totalAssignedTasks}
                        </td>
                        <td className="px-3 py-3">
                          {summary.completedOnTimeTasks}
                        </td>
                        <td className="px-3 py-3">
                          {summary.completedLateTasks}
                        </td>
                        <td className="px-3 py-3">
                          {summary.notCompletedTasks}
                        </td>
                        <td className="px-3 py-3">
                          {summary.adjustedCompletionRate}%
                        </td>
                        <td className="px-3 py-3">{summary.taskPoints} pts</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
