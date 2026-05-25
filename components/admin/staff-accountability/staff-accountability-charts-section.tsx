"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatStaffPercent,
  getLeaderboardRankClass,
  getStaffBrandLabel,
} from "@/lib/staff-accountability/format"
import type {
  StaffAccountabilityBrandSummary,
  StaffAccountabilityData,
  StaffAccountabilitySummary,
} from "@/lib/tasks/tasks"
import { cn } from "@/lib/utils"

type CompletionChartItem = {
  name: string
  fullName: string
  completionRate: number
  taskPoints: number
  completedTasks: number
  totalAssignedTasks: number
}

type BrandSummaryChartItem = StaffAccountabilityBrandSummary & {
  chartLabel: string
}

const completionChartConfig = {
  completionRate: {
    label: "Completion %",
    color: "#22c55e",
  },
} satisfies ChartConfig

const brandTaskChartConfig = {
  completedTasks: { label: "Completed", color: "#22c55e" },
  pendingTasks: { label: "Pending", color: "#3b82f6" },
  revisionTasks: { label: "Revision", color: "#f97316" },
  blockerTasks: { label: "Blocker", color: "#ef4444" },
} satisfies ChartConfig

const brandApprovalChartConfig = {
  approvedApprovals: { label: "Approved", color: "#22c55e" },
  pendingApprovals: { label: "Pending", color: "#3b82f6" },
  revisionApprovals: { label: "Revision", color: "#f97316" },
  rejectedApprovals: { label: "Rejected", color: "#ef4444" },
  scheduledPublishedApprovals: {
    label: "Scheduled / Published",
    color: "#8b5cf6",
  },
} satisfies ChartConfig

export function StaffAccountabilityLeaderboard({
  summaries,
}: {
  summaries: StaffAccountabilitySummary[]
}) {
  const topFive = summaries.slice(0, 5)

  return (
    <Card className="h-full min-w-0 shadow-none">
      <CardHeader>
        <CardTitle>Employee Leaderboard</CardTitle>
        <CardDescription>
          Ranked by total points, completion rate, then completed tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topFive.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No graded task data found for the active filters.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border-2 border-border bg-card">
            <ScrollArea className="w-full" scrollbars="horizontal">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Rank</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFive.map((employee) => (
                    <TableRow key={employee.profileId}>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex size-9 items-center justify-center rounded-lg border-2 border-border text-sm font-black tabular-nums text-foreground",
                            getLeaderboardRankClass(employee.rank)
                          )}
                        >
                          {employee.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            profileId={employee.profileId}
                            name={employee.fullName}
                            email={employee.email}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-bold">
                              {employee.fullName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                        {getStaffBrandLabel(employee.brands)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={employee.performanceLabel}
                          type="performance"
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatStaffPercent(employee.completionRate)} (
                        {employee.completedTasks}/{employee.totalAssignedTasks})
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {employee.taskPoints} pts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompletionChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: CompletionChartItem }[]
}) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0]?.payload

  if (!item) {
    return null
  }

  return (
    <div className="grid min-w-[220px] gap-1.5 rounded-lg border-2 border-border bg-background px-3 py-2 text-xs shadow-none">
      <div>
        <p className="font-semibold">{item.fullName}</p>
        <p className="text-muted-foreground">
          {item.completedTasks}/{item.totalAssignedTasks} completed
        </p>
      </div>
      <div className="grid gap-0.5 text-muted-foreground">
        <p>
          Completion: {formatStaffPercent(item.completionRate)} (
          {item.completedTasks}/{item.totalAssignedTasks})
        </p>
        <p>Points: {item.taskPoints} pts</p>
      </div>
    </div>
  )
}

export function StaffAccountabilityCompletionChart({
  summaries,
}: {
  summaries: StaffAccountabilitySummary[]
}) {
  const chartData: CompletionChartItem[] = summaries.slice(0, 8).map((summary) => ({
    name:
      summary.fullName.length > 14
        ? `${summary.fullName.slice(0, 13)}...`
        : summary.fullName,
    fullName: summary.fullName,
    completionRate: summary.completionRate,
    taskPoints: summary.taskPoints,
    completedTasks: summary.completedTasks,
    totalAssignedTasks: summary.totalAssignedTasks,
  }))
  const chartMinWidth = Math.max(420, chartData.length * 90)

  return (
    <Card className="h-full min-w-0 shadow-none">
      <CardHeader>
        <CardTitle>Team Completion Distribution</CardTitle>
        <CardDescription>
          Completion rate by employee, with points in the tooltip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chart data found.</p>
        ) : (
          <ScrollArea className="w-full min-w-0" scrollbars="horizontal">
            <div style={{ minWidth: chartMinWidth }}>
              <ChartContainer
                config={completionChartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip content={<CompletionChartTooltip />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="completionRate"
                    fill="var(--color-completionRate)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function toBrandChartItems(
  summaries: StaffAccountabilityBrandSummary[]
): BrandSummaryChartItem[] {
  return summaries.map((summary) => ({
    ...summary,
    chartLabel:
      summary.brandName.length > 16
        ? `${summary.brandName.slice(0, 15)}...`
        : summary.brandName,
  }))
}

function BrandSummaryTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: BrandSummaryChartItem }[]
}) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0]?.payload

  if (!item) {
    return null
  }

  return (
    <div className="grid min-w-[260px] gap-2 rounded-lg border-2 border-border bg-background px-3 py-2 text-xs shadow-none">
      <p className="font-semibold">{item.brandName}</p>
      <div className="grid gap-1 text-muted-foreground">
        <p>Total tasks: {item.totalAssignedTasks}</p>
        <p>Completed tasks: {item.completedTasks}</p>
        <p>Pending tasks: {item.pendingTasks}</p>
        <p>Revision tasks: {item.revisionTasks}</p>
        <p>Blocker tasks: {item.blockerTasks}</p>
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <p>Total approvals: {item.totalApprovals}</p>
        <p>Approved approvals: {item.approvedApprovals}</p>
        <p>Pending approvals: {item.pendingApprovals}</p>
        <p>Revision approvals: {item.revisionApprovals}</p>
        <p>Rejected approvals: {item.rejectedApprovals}</p>
        <p>Scheduled / published: {item.scheduledPublishedApprovals}</p>
      </div>
    </div>
  )
}

function BrandTaskChart({ data }: { data: BrandSummaryChartItem[] }) {
  const chartMinWidth = Math.max(420, data.length * 112)

  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader>
        <CardTitle>Brand Task Completion</CardTitle>
        <CardDescription>
          Completed, pending, revision, and blocker task counts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No task chart data found.</p>
        ) : (
          <ScrollArea className="w-full min-w-0" scrollbars="horizontal">
            <div style={{ minWidth: chartMinWidth }}>
              <ChartContainer
                config={brandTaskChartConfig}
                className="aspect-auto h-[320px] w-full"
              >
                <BarChart data={data} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="chartLabel"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<BrandSummaryTooltip />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="completedTasks"
                    fill="var(--color-completedTasks)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pendingTasks"
                    fill="var(--color-pendingTasks)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="revisionTasks"
                    fill="var(--color-revisionTasks)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="blockerTasks"
                    fill="var(--color-blockerTasks)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function BrandApprovalChart({ data }: { data: BrandSummaryChartItem[] }) {
  const chartMinWidth = Math.max(420, data.length * 112)

  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader>
        <CardTitle>Brand Approval Status</CardTitle>
        <CardDescription>
          Approval movement by brand across the active filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No approval chart data found.
          </p>
        ) : (
          <ScrollArea className="w-full min-w-0" scrollbars="horizontal">
            <div style={{ minWidth: chartMinWidth }}>
              <ChartContainer
                config={brandApprovalChartConfig}
                className="aspect-auto h-[320px] w-full"
              >
                <BarChart data={data} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="chartLabel"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<BrandSummaryTooltip />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="approvedApprovals"
                    fill="var(--color-approvedApprovals)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pendingApprovals"
                    fill="var(--color-pendingApprovals)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="revisionApprovals"
                    fill="var(--color-revisionApprovals)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="rejectedApprovals"
                    fill="var(--color-rejectedApprovals)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="scheduledPublishedApprovals"
                    fill="var(--color-scheduledPublishedApprovals)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export function StaffAccountabilityBrandSummary({ data }: { data: StaffAccountabilityData }) {
  const chartData = toBrandChartItems(data.brandSummaries)

  return (
    <section className="space-y-3">

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <BrandTaskChart data={chartData} />
        <BrandApprovalChart data={chartData} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Exact Counts</CardTitle>
          <CardDescription>
            Compact numbers behind the brand charts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full" scrollbars="horizontal">
            <div className="min-w-[980px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Task Completion</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Done</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Blocker</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Rejected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.brandSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No brand activity found for the active filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.brandSummaries.map((brand) => (
                      <TableRow key={brand.brandId}>
                        <TableCell>
                          <p className="font-semibold">{brand.brandName}</p>
                        </TableCell>
                        <TableCell>
                          {brand.totalAssignedTasks > 0
                            ? formatStaffPercent(brand.taskCompletionRate)
                            : "No graded tasks"}
                        </TableCell>
                        <TableCell>{brand.totalAssignedTasks}</TableCell>
                        <TableCell>
                          <StatusBadge status="DONE" type="task" size="sm">
                            {brand.completedTasks}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status="PENDING" type="task" size="sm">
                            {brand.pendingTasks}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status="REVISION" type="task" size="sm">
                            {brand.revisionTasks}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status="BLOCKER" type="task" size="sm">
                            {brand.blockerTasks}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{brand.totalApprovals}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status="APPROVED"
                            type="approval"
                            size="sm"
                          >
                            {brand.approvedApprovals}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status="REJECTED"
                            type="approval"
                            size="sm"
                          >
                            {brand.rejectedApprovals}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  )
}

