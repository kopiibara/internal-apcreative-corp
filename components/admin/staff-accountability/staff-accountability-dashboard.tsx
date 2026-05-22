"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Award,
  Ban,
  CheckCircle2,
  Trophy,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  DailyReportBrandOption,
  DailyReportEmployeeOption,
} from "@/lib/daily-reports"
import type {
  StaffAccountabilityData,
  StaffAccountabilityBrandSummary,
  StaffAccountabilitySummary,
} from "@/lib/tasks"
import { cn } from "@/lib/utils"

type CompletionChartItem = {
  name: string
  fullName: string
  completionRate: number
  taskPoints: number
  completedTasks: number
  totalAssignedTasks: number
}

type StaffAccountabilityDashboardProps = {
  data: StaffAccountabilityData
  brands: DailyReportBrandOption[]
  employees: DailyReportEmployeeOption[]
  filters: {
    month: string
    brandId: string
    employeeId: string
  }
}

type SummaryCardProps = {
  title: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  className: string
  iconClassName: string
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
  completedTasks: {
    label: "Completed",
    color: "#22c55e",
  },
  pendingTasks: {
    label: "Pending",
    color: "#3b82f6",
  },
  revisionTasks: {
    label: "Revision",
    color: "#f97316",
  },
  blockerTasks: {
    label: "Blocker",
    color: "#ef4444",
  },
} satisfies ChartConfig

const brandApprovalChartConfig = {
  approvedApprovals: {
    label: "Approved",
    color: "#22c55e",
  },
  pendingApprovals: {
    label: "Pending",
    color: "#3b82f6",
  },
  revisionApprovals: {
    label: "Revision",
    color: "#f97316",
  },
  rejectedApprovals: {
    label: "Rejected",
    color: "#ef4444",
  },
  scheduledPublishedApprovals: {
    label: "Scheduled / Published",
    color: "#8b5cf6",
  },
} satisfies ChartConfig

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function getMonthOptions() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  const now = new Date()
  const options = []

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1))
    const value = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")}`

    options.push({
      value,
      label: formatter.format(date),
    })
  }

  return options
}

function getBrandLabel(brands: StaffAccountabilitySummary["brands"]) {
  if (brands.length === 0) {
    return "No active brand"
  }

  if (brands.length <= 2) {
    return brands.map((brand) => brand.brandName).join(", ")
  }

  return `${brands
    .slice(0, 2)
    .map((brand) => brand.brandName)
    .join(", ")} +${brands.length - 2}`
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  className,
  iconClassName,
}: SummaryCardProps) {
  return (
    <Card className={cn("min-w-0 overflow-hidden shadow-none", className)}>
      <div className={cn("h-2 border-b-2 border-border", iconClassName)} />
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-foreground/70">{detail}</p>
        </div>
        <div
          className={cn(
            "rounded-md border-2 border-border p-2 text-foreground",
            iconClassName
          )}
        >
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}

function StaffAccountabilityFilters({
  brands,
  employees,
  filters,
}: Pick<
  StaffAccountabilityDashboardProps,
  "brands" | "employees" | "filters"
>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateFilter(key: "month" | "brandId" | "employeeId", value: string) {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (value === "all") {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }

    router.push(`${pathname}?${nextParams.toString()}`)
  }

  return (
    <Card className="shadow-none">
      <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Select
          value={filters.month}
          onValueChange={(value) => updateFilter("month", value)}
        >
          <SelectTrigger aria-label="Filter by month">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {getMonthOptions().map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.brandId}
          onValueChange={(value) => updateFilter("brandId", value)}
        >
          <SelectTrigger aria-label="Filter by brand">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.employeeId}
          onValueChange={(value) => updateFilter("employeeId", value)}
        >
          <SelectTrigger aria-label="Filter by employee">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={String(employee.id)}>
                {employee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button asChild variant="outline">
          <Link href="/admin/staff-accountability">Reset filters</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function TopSummaryCards({ data }: { data: StaffAccountabilityData }) {
  const { teamSummary } = data

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Average Team Completion"
          value={formatPercent(teamSummary.averageTeamCompletion)}
          detail="Average across included employees"
          icon={Trophy}
          className="border-emerald-600 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
          iconClassName="bg-emerald-500"
        />
        <SummaryCard
          title="Total Team Points"
          value={`${teamSummary.totalTeamPoints}`}
          detail="Sum of employee task points"
          icon={Award}
          className="border-violet-600 bg-violet-100 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100"
          iconClassName="bg-violet-400"
        />
        <SummaryCard
          title="Total Completed Tasks"
          value={`${teamSummary.totalCompletedTasks}/${teamSummary.totalAssignedTasks}`}
          detail={`${formatPercent(teamSummary.teamCompletionRate)} completed`}
          icon={CheckCircle2}
          className="border-lime-600 bg-lime-100 text-lime-950 dark:bg-lime-950/40 dark:text-lime-100"
          iconClassName="bg-lime-400"
        />
        <SummaryCard
          title="Needs Attention"
          value={String(teamSummary.needsAttentionCount)}
          detail="Pending, revision, and blocker tasks"
          icon={Ban}
          className="border-orange-600 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100"
          iconClassName="bg-orange-400"
        />
      </div>
    </section>
  )
}

function getLeaderboardRowClass(rank: number) {
  if (rank === 1) {
    return "border-yellow-500 bg-yellow-100 text-yellow-950 dark:bg-yellow-950/40 dark:text-yellow-100"
  }

  if (rank === 2) {
    return "border-slate-400 bg-slate-100 text-slate-950 dark:bg-slate-900/70 dark:text-slate-100"
  }

  if (rank === 3) {
    return "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100"
  }

  return "border-border bg-background"
}

function getLeaderboardRankClass(rank: number) {
  if (rank === 1) {
    return "bg-yellow-400"
  }

  if (rank === 2) {
    return "bg-slate-300"
  }

  if (rank === 3) {
    return "bg-orange-400"
  }

  return "bg-muted/40"
}

function EmployeeLeaderboard({
  summaries,
}: {
  summaries: StaffAccountabilitySummary[]
}) {
  const topFive = summaries.slice(0, 5)

  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle>Employee Leaderboard</CardTitle>
        <CardDescription>
          Ranked by total points, completion rate, then completed tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {topFive.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No graded task data found for the active filters.
          </p>
        ) : (
          topFive.map((employee) => (
            <div
              key={employee.profileId}
              className={cn(
                "grid gap-3 rounded-md border-2 p-3 sm:grid-cols-[auto_auto_1fr_auto]",
                getLeaderboardRowClass(employee.rank)
              )}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-md border-2 border-border text-lg font-semibold tabular-nums text-foreground",
                  getLeaderboardRankClass(employee.rank)
                )}
              >
                {employee.rank}
              </div>
              <div className="flex size-10 items-center justify-center rounded-md border-2 border-border bg-background/70 text-xs font-semibold">
                {getInitials(employee.fullName)}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{employee.fullName}</p>
                  <StatusBadge
                    status={employee.performanceLabel}
                    type="performance"
                    size="sm"
                  />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {employee.email}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Brands: {getBrandLabel(employee.brands)}
                </p>
              </div>
              <div className="grid gap-1 rounded-md border-2 border-border bg-background/70 px-3 py-2 text-right text-xs sm:min-w-32">
                <p className="text-lg font-semibold tabular-nums">
                  {formatPercent(employee.completionRate)} (
                  {employee.completedTasks}/{employee.totalAssignedTasks}) -{" "}
                  {employee.taskPoints} pts
                </p>
              </div>
            </div>
          ))
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
    <div className="grid min-w-[220px] gap-1.5 rounded-md border-2 border-border bg-background px-3 py-2 text-xs shadow-none">
      <div>
        <p className="font-semibold">{item.fullName}</p>
        <p className="text-muted-foreground">
          {item.completedTasks}/{item.totalAssignedTasks} completed
        </p>
      </div>
      <div className="grid gap-0.5 text-muted-foreground">
        <p>
          Completion: {formatPercent(item.completionRate)} (
          {item.completedTasks}/{item.totalAssignedTasks})
        </p>
        <p>Points: {item.taskPoints} pts</p>
      </div>
    </div>
  )
}

function CompletionRateChart({
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
    <div className="grid min-w-[260px] gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs shadow-none">
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

function BrandTaskApprovalSummary({ data }: { data: StaffAccountabilityData }) {
  const chartData = toBrandChartItems(data.brandSummaries)

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-normal">
          Brand Task & Approval Summary
        </h2>
        <p className="text-sm text-muted-foreground">
          Visual comparison of task completion and approval status by brand.
        </p>
      </div>

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
                            ? formatPercent(brand.taskCompletionRate)
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

export function StaffAccountabilityDashboard({
  data,
  brands,
  employees,
  filters,
}: StaffAccountabilityDashboardProps) {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">
          Staff Accountability
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Performance tracking based on task completion rate and points.
        </p>
      </div>

      <StaffAccountabilityFilters
        brands={brands}
        employees={employees}
        filters={filters}
      />

      <TopSummaryCards data={data} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <EmployeeLeaderboard summaries={data.summaries} />
        <CompletionRateChart summaries={data.summaries} />
      </div>

      <BrandTaskApprovalSummary data={data} />
    </div>
  )
}
