"use client";

import {
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, FilePlus2, Play, X } from "lucide-react";
import { toast } from "sonner";

import {
  markMissedDailyProgressReports,
  reviewLateDailyProgressReport,
} from "@/app/admin/daily-progress/actions";
import { DailyProgressReportDetailsSheet } from "@/components/daily-progress/daily-progress-report-details-sheet";
import { DailyProgressStatusBadge } from "@/components/daily-progress/daily-progress-status-badge";
import {
  EmployeeDailyProgressDashboard,
  type EmployeeDailyProgressDashboardProps,
} from "@/components/daily-progress/employee-daily-progress-dashboard";
import {
  KanbanBoardShell,
  KANBAN_BOARD_SCROLL_ROW_CLASS,
  KANBAN_COLUMN_BODY_CLASS,
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_FIT_CLASS,
  KANBAN_COLUMN_LIST_CLASS,
  KANBAN_COLUMN_VIEWPORT_CLASS,
  KANBAN_OVERLAY_CLASS,
} from "@/components/shared/kanban-board-scroll";
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from "@/components/reui/kanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextRenderer } from "@/components/ui/rich-text-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  DailyProgressReportRecord,
  DailyProgressSummary,
} from "@/lib/daily-progress-report/daily-progress-report";
import { DAILY_PROGRESS_SCORING_START_DATE_KEY } from "@/lib/daily-progress-report/constants";
import { cn } from "@/lib/utils";

type AdminDailyProgressDashboardProps = {
  reports: DailyProgressReportRecord[];
  summary: DailyProgressSummary;
  targetDate: string;
  ownDailyProgressData?: EmployeeDailyProgressDashboardProps | null;
};

type StatusFilter = "all" | "Submitted" | "Late Pending" | "Missed";
type ReviewDecision = "Approved" | "Rejected";

const STATUS_COLUMNS: {
  key: StatusFilter;
  title: string;
  badgeClassName: string;
}[] = [
    {
      key: "Submitted",
      title: "Submitted",
      badgeClassName: "border-green-700 bg-green-100 text-green-900",
    },
    {
      key: "Late Pending",
      title: "Late Pending",
      badgeClassName: "border-yellow-700 bg-yellow-100 text-yellow-950",
    },
    {
      key: "Missed",
      title: "Missed",
      badgeClassName: "border-red-700 bg-red-100 text-red-900",
    },
  ];

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card className={cn(
      "min-h-[150px] min-w-0 justify-between overflow-hidden px-0 py-4 md:min-h-[190px] ",
      tone,
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.16em]" >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <h1 className="text-5xl font-black tabular-nums">{value}</h1>
      </CardContent>
    </Card>
  );
}

function getTone(report: DailyProgressReportRecord) {
  if (report.status === "Submitted") {
    return "green" as const;
  }

  if (report.status === "Late" && report.lateApprovalStatus === "Pending") {
    return "yellow" as const;
  }

  if (report.status === "Missed") {
    return "red" as const;
  }

  return "blue" as const;
}

function getReportStatusKey(report: DailyProgressReportRecord): StatusFilter {
  if (report.status === "Late" && report.lateApprovalStatus === "Pending") {
    return "Late Pending";
  }

  if (report.status === "Missed") {
    return "Missed";
  }

  if (
    report.status === "Submitted" ||
    (report.status === "Late" && report.lateApprovalStatus === "Approved")
  ) {
    return "Submitted";
  }

  return "all";
}

function getRecentDateOptions(anchorDateKey: string, days = 14) {
  const anchorDate = new Date(`${anchorDateKey}T12:00:00+08:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(anchorDate);
    date.setUTCDate(anchorDate.getUTCDate() - index);

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(date);
  }).filter((dateKey) => dateKey >= DAILY_PROGRESS_SCORING_START_DATE_KEY);
}

function DailyProgressSummaryPreview({
  value,
  fallback,
  compact = false,
}: {
  value: string | null | undefined;
  fallback?: string | null;
  compact?: boolean;
}) {
  if (!value?.trim()) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        {fallback || "-"}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 text-sm text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0 [&_p]:my-0",
        compact && "max-h-12 overflow-hidden",
      )}
    >
      <RichTextRenderer value={value} />
    </div>
  );
}

function EmployeeIdentity({ report }: { report: DailyProgressReportRecord }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        profileId={report.profileId}
        name={report.employeeName}
        email={report.employeeEmail}
        imageUrl={report.employeeImageUrl}
        size="md"
      />
      <div className="min-w-0">
        <div className="truncate font-bold">{report.employeeName}</div>
        <div className="truncate text-xs text-muted-foreground">
          {report.employeeEmail}
        </div>
      </div>
    </div>
  );
}

function DailyProgressKanbanCard({
  report,
  muted = false,
  onClick,
  children,
}: {
  report: DailyProgressReportRecord;
  muted?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const isClickable = Boolean(onClick);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isClickable) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  }

  return (
    <article
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-disabled={muted}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-lg border-2 border-border  bg-white dark:bg-gray-900 p-3 text-left transition",
        isClickable &&
        "cursor-pointer hover:-translate-y-0.5 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        muted && "opacity-70 grayscale-[0.2]",
      )}
    >
      <EmployeeIdentity report={report} />

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="font-mono">{report.reportDate}</span>
        <span className="font-black tabular-nums">
          {report.netPoints > 0 ? "+" : ""}
          {report.netPoints} pts
        </span>
      </div>

      <DailyProgressSummaryPreview
        value={report.summary}
        fallback={report.excusedReason}
        compact
      />

      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}

function DailyProgressKanbanReviewActions({
  report,
  reviewNotes,
  awardPoints,
  activeDecision,
  isPending,
  onStartReview,
  onCancelReview,
  onReviewNotesChange,
  onAwardPointsChange,
  onReview,
}: {
  report: DailyProgressReportRecord;
  reviewNotes: string;
  awardPoints: string;
  activeDecision?: ReviewDecision;
  isPending: boolean;
  onStartReview: (reportId: number, decision: ReviewDecision) => void;
  onCancelReview: (reportId: number) => void;
  onReviewNotesChange: (reportId: number, value: string) => void;
  onAwardPointsChange: (reportId: number, value: string) => void;
  onReview: (reportId: number, decision: ReviewDecision) => void;
}) {
  function stopCardEvent(event: SyntheticEvent) {
    event.stopPropagation();
  }

  if (!activeDecision) {
    return (
      <div
        className="space-y-2 rounded-lg border-2 border-border bg-muted/20 p-2"
        onClick={stopCardEvent}
        onPointerDown={stopCardEvent}
        onKeyDown={stopCardEvent}
      >
        <p className="text-xs text-muted-foreground">
          Reason: {report.lateReason || "-"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              onStartReview(report.id, "Approved");
            }}
          >
            <Check className="size-3" />
            Approve
          </Button>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 gap-1 text-xs"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              onStartReview(report.id, "Rejected");
            }}
          >
            <X className="size-3" />
            Reject
          </Button>
        </div>
      </div>
    );
  }

  const isApproving = activeDecision === "Approved";

  return (
    <div
      className="space-y-2 rounded-lg border-2 border-border bg-muted/20 p-2"
      onClick={stopCardEvent}
      onPointerDown={stopCardEvent}
      onKeyDown={stopCardEvent}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">
          {isApproving ? "Approve late report" : "Reject late report"}
        </p>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onCancelReview(report.id);
          }}
        >
          Back
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Reason: {report.lateReason || "-"}
      </p>

      <Textarea
        value={reviewNotes}
        onChange={(event) => onReviewNotesChange(report.id, event.target.value)}
        disabled={isPending}
        rows={2}
        placeholder="Review note"
        className="min-h-16 text-xs"
      />

      {isApproving ? (
        <Select
          value={awardPoints}
          onValueChange={(value) => onAwardPointsChange(report.id, value)}
          disabled={isPending}
        >
          <SelectTrigger aria-label="Points awarded" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 11 }, (_, points) => (
              <SelectItem key={points} value={String(points)}>
                Award {points} pts
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant={isApproving ? "default" : "destructive"}
        className="h-8 w-full gap-1 text-xs"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          onReview(report.id, activeDecision);
        }}
      >
        {isApproving ? (
          <>
            <Check className="size-3" />
            Confirm Approval
          </>
        ) : (
          <>
            <X className="size-3" />
            Confirm Rejection
          </>
        )}
      </Button>
    </div>
  );
}

function DailyProgressKanbanColumn({
  id,
  title,
  count,
  badgeClassName,
  children,
}: {
  id: StatusFilter;
  title: string;
  count: number;
  badgeClassName: string;
  children: React.ReactNode;
}) {
  const listClassName = cn(
    KANBAN_COLUMN_LIST_CLASS,
    count === 0 && "items-center justify-center",
  );

  return (
    <KanbanColumn value={id} className={cn(KANBAN_COLUMN_FIT_CLASS, "h-auto")}>
      <Card className={KANBAN_COLUMN_CARD_CLASS}>
        <KanbanColumnHeader
          title={title}
          count={count}
          countClassName={badgeClassName}
        />
        <ScrollArea
          className={KANBAN_COLUMN_BODY_CLASS}
          viewportClassName={KANBAN_COLUMN_VIEWPORT_CLASS}
          scrollbars="vertical"
        >
          <KanbanColumnContent value={id} className={listClassName}>
            {count === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                No reports here.
              </p>
            ) : (
              children
            )}
          </KanbanColumnContent>
        </ScrollArea>
      </Card>
    </KanbanColumn>
  );
}

export function AdminDailyProgressDashboard({
  reports,
  summary,
  targetDate,
  ownDailyProgressData,
}: AdminDailyProgressDashboardProps) {
  const router = useRouter();

  const [reviewNotesById, setReviewNotesById] = useState<Record<number, string>>(
    {},
  );

  const [awardPointsById, setAwardPointsById] = useState<Record<number, string>>(
    {},
  );

  const [reviewDecisionById, setReviewDecisionById] = useState<
    Record<number, ReviewDecision | undefined>
  >({});

  const [activeView, setActiveView] = useState<"kanban" | "table">("kanban");
  const [missedDate, setMissedDate] = useState(targetDate);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showOwnProgressForm, setShowOwnProgressForm] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<DailyProgressReportRecord | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const recentDateOptions = useMemo(
    () => getRecentDateOptions(targetDate),
    [targetDate],
  );

  const employeeOptions = useMemo(() => {
    const employees = new Map<number, string>();

    for (const report of reports) {
      employees.set(report.profileId, report.employeeName);
    }

    return [...employees.entries()].sort((left, right) =>
      left[1].localeCompare(right[1]),
    );
  }, [reports]);

  const reportDateOptions = useMemo(() => {
    const dates = new Set([
      ...recentDateOptions,
      ...reports
        .map((report) => report.reportDate)
        .filter((dateKey) => dateKey >= DAILY_PROGRESS_SCORING_START_DATE_KEY),
    ]);

    return [...dates].sort((left, right) => right.localeCompare(left));
  }, [recentDateOptions, reports]);

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const matchesEmployee =
          employeeFilter === "all" || String(report.profileId) === employeeFilter;

        const matchesDate =
          dateFilter === "all" || report.reportDate === dateFilter;

        const matchesStatus =
          statusFilter === "all" || getReportStatusKey(report) === statusFilter;

        return matchesEmployee && matchesDate && matchesStatus;
      }),
    [dateFilter, employeeFilter, reports, statusFilter],
  );

  const columns = useMemo(
    () =>
      STATUS_COLUMNS.reduce<Record<string, DailyProgressReportRecord[]>>(
        (nextColumns, column) => {
          nextColumns[column.key] = filteredReports.filter(
            (report) => getReportStatusKey(report) === column.key,
          );

          return nextColumns;
        },
        {},
      ),
    [filteredReports],
  );

  const boardSyncKey = useMemo(
    () =>
      filteredReports
        .map(
          (report) =>
            `${report.id}:${report.status}:${report.lateApprovalStatus ?? "none"
            }`,
        )
        .join("|"),
    [filteredReports],
  );

  const visibleSummary = useMemo(
    () => ({
      requiredEmployees: summary.requiredEmployees,
      submittedCount: filteredReports.filter(
        (report) => getReportStatusKey(report) === "Submitted",
      ).length,
      latePendingCount: filteredReports.filter(
        (report) => getReportStatusKey(report) === "Late Pending",
      ).length,
      missedCount: filteredReports.filter(
        (report) => getReportStatusKey(report) === "Missed",
      ).length,
    }),
    [filteredReports, summary.requiredEmployees],
  );

  function openReportDetails(report: DailyProgressReportRecord) {
    setSelectedReport(report);
    setIsDetailsSheetOpen(true);
  }

  function handleDetailsSheetOpenChange(nextOpen: boolean) {
    setIsDetailsSheetOpen(nextOpen);

    if (!nextOpen) {
      setSelectedReport(null);
    }
  }

  function startReviewDraft(reportId: number, decision: ReviewDecision) {
    setReviewDecisionById((current) => ({
      ...current,
      [reportId]: decision,
    }));
  }

  function cancelReviewDraft(reportId: number) {
    setReviewDecisionById((current) => {
      const next = { ...current };
      delete next[reportId];
      return next;
    });
  }

  function updateReviewNotes(reportId: number, value: string) {
    setReviewNotesById((current) => ({
      ...current,
      [reportId]: value,
    }));
  }

  function updateAwardPoints(reportId: number, value: string) {
    setAwardPointsById((current) => ({
      ...current,
      [reportId]: value,
    }));
  }

  function clearReviewDraft(reportId: number) {
    setReviewDecisionById((current) => {
      const next = { ...current };
      delete next[reportId];
      return next;
    });

    setReviewNotesById((current) => {
      const next = { ...current };
      delete next[reportId];
      return next;
    });

    setAwardPointsById((current) => {
      const next = { ...current };
      delete next[reportId];
      return next;
    });
  }

  function handleReview(reportId: number, decision: ReviewDecision) {
    startTransition(async () => {
      const result = await reviewLateDailyProgressReport({
        reportId,
        decision,
        pointsAwarded:
          decision === "Approved"
            ? Number(awardPointsById[reportId] ?? 5)
            : undefined,
        reviewNotes: reviewNotesById[reportId] ?? "",
      });

      if (result.success) {
        toast.success(result.message);
        clearReviewDraft(reportId);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleMove({
    activeContainer,
    overContainer,
    activeIndex,
  }: KanbanMoveEvent) {
    if (isPending) {
      return;
    }

    if (activeContainer === overContainer) {
      return;
    }

    const report = columns[activeContainer]?.[activeIndex];

    if (!report) {
      return;
    }

    if (
      report.status !== "Late" ||
      report.lateApprovalStatus !== "Pending" ||
      activeContainer !== "Late Pending"
    ) {
      toast.error("Only pending late submissions can be moved.");
      return;
    }

    if (overContainer !== "Submitted" && overContainer !== "Missed") {
      toast.error("Move late submissions to Submitted or Missed.");
      return;
    }

    startTransition(async () => {
      const decision = overContainer === "Submitted" ? "Approved" : "Rejected";

      const result = await reviewLateDailyProgressReport({
        reportId: report.id,
        decision,
        reviewNotes:
          decision === "Rejected"
            ? "Rejected via Daily Progress Kanban."
            : "Approved via Daily Progress Kanban.",
      });

      if (result.success) {
        toast.success(result.message);
        clearReviewDraft(report.id);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleMarkMissed() {
    startTransition(async () => {
      const result = await markMissedDailyProgressReports({
        targetDate: missedDate,
      });

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Daily Progress Report
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monitor submissions, deductions, and late report approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Select value={missedDate} onValueChange={setMissedDate}>
              <SelectTrigger className="w-44" aria-label="Missed checker date">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recentDateOptions.map((dateKey) => (
                  <SelectItem key={dateKey} value={dateKey}>
                    {dateKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="neutral"
            className="gap-2"
            disabled={isPending}
            onClick={handleMarkMissed}
          >
            <Play className="size-4" />
            Run Checker
          </Button>

          {ownDailyProgressData ? (
            <Button
              type="button"
              variant="default"
              className="gap-2"
              onClick={() => setShowOwnProgressForm((current) => !current)}
            >
              <FilePlus2 className="size-4" />
              {showOwnProgressForm ? "Hide My Report" : "Add My Report"}
            </Button>
          ) : null}
        </div>
      </div>

      {ownDailyProgressData && showOwnProgressForm ? (
        <EmployeeDailyProgressDashboard {...ownDailyProgressData} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Required Staff"
          value={visibleSummary.requiredEmployees}
          tone="bg-background text-foreground"

        />
        <SummaryCard label="Submitted" value={visibleSummary.submittedCount} tone="bg-blue text-white"
        />
        <SummaryCard
          label="Late Pending"
          value={visibleSummary.latePendingCount}
          tone="bg-cyan text-white"
        />
        <SummaryCard label="Missed" value={visibleSummary.missedCount} tone="bg-magenta text-white"
        />
      </div>

      <Card className="shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger aria-label="Filter by employee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {employeeOptions.map(([profileId, employeeName]) => (
                  <SelectItem key={profileId} value={String(profileId)}>
                    {employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Late Pending">Late Pending</SelectItem>
                <SelectItem value="Missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger aria-label="Filter by date">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All loaded dates</SelectItem>
                {reportDateOptions.map((dateKey) => (
                  <SelectItem key={dateKey} value={dateKey}>
                    {dateKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "kanban" | "table")}
      >
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4 min-w-0 overflow-hidden">
          <KanbanBoardShell>
            <Kanban
              key={boardSyncKey}
              value={columns}
              onValueChange={() => undefined}
              getItemValue={(report) => String(report.id)}
              onMove={handleMove}
            >
              <KanbanBoard
                className={cn(
                  KANBAN_BOARD_SCROLL_ROW_CLASS,
                  "xl:grid xl:w-full xl:min-w-0 xl:grid-cols-3",
                )}
              >
                {STATUS_COLUMNS.map((column) => {
                  const columnReports = columns[column.key] ?? [];

                  return (
                    <DailyProgressKanbanColumn
                      key={column.key}
                      id={column.key}
                      title={column.title}
                      count={columnReports.length}
                      badgeClassName={column.badgeClassName}
                    >
                      {columnReports.map((report) => {
                        const isDraggable =
                          report.status === "Late" &&
                          report.lateApprovalStatus === "Pending";

                        const cardKey = `${report.id}-${report.status}-${report.lateApprovalStatus ?? "none"
                          }`;

                        if (!isDraggable) {
                          return (
                            <DailyProgressKanbanCard
                              key={cardKey}
                              report={report}
                              muted
                              onClick={() => openReportDetails(report)}
                            />
                          );
                        }

                        return (
                          <KanbanItem key={cardKey} value={String(report.id)}>
                            <KanbanItemHandle cursor={isDraggable}>
                              <DailyProgressKanbanCard
                                report={report}
                                muted={isPending}
                                onClick={() => openReportDetails(report)}
                              >
                                <DailyProgressKanbanReviewActions
                                  report={report}
                                  reviewNotes={reviewNotesById[report.id] ?? ""}
                                  awardPoints={awardPointsById[report.id] ?? "5"}
                                  activeDecision={reviewDecisionById[report.id]}
                                  isPending={isPending}
                                  onStartReview={startReviewDraft}
                                  onCancelReview={cancelReviewDraft}
                                  onReviewNotesChange={updateReviewNotes}
                                  onAwardPointsChange={updateAwardPoints}
                                  onReview={handleReview}
                                />
                              </DailyProgressKanbanCard>
                            </KanbanItemHandle>
                          </KanbanItem>
                        );
                      })}
                    </DailyProgressKanbanColumn>
                  );
                })}
              </KanbanBoard>

              <KanbanOverlay className={KANBAN_OVERLAY_CLASS} />
            </Kanban>
          </KanbanBoardShell>
        </TabsContent>

        <TabsContent value="table" className="mt-4 min-w-0 overflow-hidden">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-lg border-2 border-border">
                <ScrollArea className="w-full" scrollbars="horizontal">
                  <Table className="min-w-[1180px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Late Status</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Review</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="h-24 text-center">
                            No Daily Progress Reports found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <EmployeeIdentity report={report} />
                            </TableCell>

                            <TableCell>{report.brandName ?? "No brand"}</TableCell>

                            <TableCell className="font-mono text-xs">
                              {report.reportDate}
                            </TableCell>

                            <TableCell>
                              <DailyProgressStatusBadge
                                label={report.status}
                                tone={getTone(report)}
                              />
                            </TableCell>

                            <TableCell>
                              {report.lateApprovalStatus ?? "-"}
                            </TableCell>

                            <TableCell className="max-w-72">
                              <DailyProgressSummaryPreview
                                value={report.summary}
                                fallback={report.excusedReason}
                                compact
                              />

                              {report.proofLink ? (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-7 gap-1 px-0"
                                >
                                  <Link
                                    href={report.proofLink}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Proof <ExternalLink className="size-3" />
                                  </Link>
                                </Button>
                              ) : null}
                            </TableCell>

                            <TableCell className="text-right font-bold tabular-nums">
                              {report.pointsAwarded}
                            </TableCell>

                            <TableCell className="text-right font-bold tabular-nums">
                              {report.deductionApplied}
                            </TableCell>

                            <TableCell className="text-right font-black tabular-nums">
                              {report.netPoints}
                            </TableCell>

                            <TableCell>
                              {report.status === "Late" &&
                                report.lateApprovalStatus === "Pending" ? (
                                <div className="grid min-w-64 gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    Reason: {report.lateReason}
                                  </p>

                                  <Textarea
                                    value={reviewNotesById[report.id] ?? ""}
                                    onChange={(event) =>
                                      updateReviewNotes(
                                        report.id,
                                        event.target.value,
                                      )
                                    }
                                    rows={2}
                                    placeholder="Review note"
                                  />

                                  <Select
                                    value={awardPointsById[report.id] ?? "5"}
                                    onValueChange={(value) =>
                                      updateAwardPoints(report.id, value)
                                    }
                                  >
                                    <SelectTrigger aria-label="Points awarded">
                                      <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                      {Array.from({ length: 11 }, (_, points) => (
                                        <SelectItem
                                          key={points}
                                          value={String(points)}
                                        >
                                          Award {points} pts
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="gap-1"
                                      disabled={isPending}
                                      onClick={() =>
                                        handleReview(report.id, "Approved")
                                      }
                                    >
                                      <Check className="size-3" />
                                      Approve
                                    </Button>

                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      className="gap-1"
                                      disabled={isPending}
                                      onClick={() =>
                                        handleReview(report.id, "Rejected")
                                      }
                                    >
                                      <X className="size-3" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {report.lateReviewNotes ?? "-"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DailyProgressReportDetailsSheet
        report={selectedReport}
        open={isDetailsSheetOpen}
        onOpenChange={handleDetailsSheetOpenChange}
      />
    </div>
  );
}
