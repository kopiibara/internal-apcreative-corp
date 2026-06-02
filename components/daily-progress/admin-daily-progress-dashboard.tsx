"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markMissedDailyProgressReports,
  reviewLateDailyProgressReport,
} from "@/app/admin/daily-progress/actions";
import { AdminDailyProgressKanbanBoard } from "@/components/daily-progress/admin-daily-progress-kanban";
import { AdminDailyProgressSummaryCards } from "@/components/daily-progress/admin-daily-progress-summary-cards";
import { AdminDailyProgressTable } from "@/components/daily-progress/admin-daily-progress-table";
import { AdminDailyProgressToolbar } from "@/components/daily-progress/admin-daily-progress-toolbar";
import type {
  AdminDailyProgressDashboardProps,
  DailyProgressReviewDecision,
  DailyProgressStatusFilter,
} from "@/types/admin-daily-progress-types";
import {
  DAILY_PROGRESS_STATUS_COLUMNS,
  getDailyProgressStatusKey,
  getRecentDailyProgressDateOptions,
} from "@/lib/admin-daily-progress-utils";
import { isWeekendDateKeyInPhilippines } from "@/lib/daily-reports/daily-report-filters";
import { AdminDailyProgressViewControls } from "@/components/daily-progress/admin-daily-progress-view-controls";
import { DailyProgressReportDetailsSheet } from "@/components/daily-progress/daily-progress-report-details-sheet";
import { EmployeeDailyProgressDashboard } from "@/components/daily-progress/employee-daily-progress-dashboard";
import {
  KANBAN_BOARD_PAGE_CLASS,
  KANBAN_BOARD_TAB_PANEL_CLASS,
  KANBAN_BOARD_TABS_CLASS,
} from "@/components/shared/kanban-board-scroll";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DAILY_PROGRESS_SCORING_START_DATE_KEY } from "@/lib/daily-progress-report/constants";
import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report";
import { cn } from "@/lib/utils";

export function AdminDailyProgressDashboard({
  reports,
  summary,
  boardDate,
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
    Record<number, DailyProgressReviewDecision | undefined>
  >({});
  const [activeView, setActiveView] = useState<"kanban" | "table">("kanban");
  const [missedDate, setMissedDate] = useState(targetDate);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] =
    useState<DailyProgressStatusFilter>("all");
  const [dateFilter, setDateFilter] = useState(boardDate);
  const [showOwnProgressForm, setShowOwnProgressForm] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<DailyProgressReportRecord | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const kanbanDate = dateFilter === "all" ? boardDate : dateFilter;

  const recentDateOptions = useMemo(
    () => getRecentDailyProgressDateOptions(targetDate),
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
        .filter(
          (dateKey) =>
            dateKey >= DAILY_PROGRESS_SCORING_START_DATE_KEY &&
            !isWeekendDateKeyInPhilippines(dateKey),
        ),
    ]);

    return [...dates].sort((left, right) => right.localeCompare(left));
  }, [recentDateOptions, reports]);

  const kanbanReports = useMemo(
    () =>
      reports.filter((report) => {
        const matchesEmployee =
          employeeFilter === "all" || String(report.profileId) === employeeFilter;
        const matchesKanbanDate = report.reportDate === kanbanDate;
        const matchesStatus =
          statusFilter === "all" || getDailyProgressStatusKey(report) === statusFilter;

        return matchesEmployee && matchesKanbanDate && matchesStatus;
      }),
    [employeeFilter, kanbanDate, reports, statusFilter],
  );

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const matchesEmployee =
          employeeFilter === "all" || String(report.profileId) === employeeFilter;
        const matchesDate = dateFilter === "all" || report.reportDate === dateFilter;
        const matchesStatus =
          statusFilter === "all" || getDailyProgressStatusKey(report) === statusFilter;

        return matchesEmployee && matchesDate && matchesStatus;
      }),
    [dateFilter, employeeFilter, reports, statusFilter],
  );

  const columns = useMemo(
    () =>
      DAILY_PROGRESS_STATUS_COLUMNS.reduce<Record<string, DailyProgressReportRecord[]>>(
        (nextColumns, column) => {
          nextColumns[column.key] = kanbanReports.filter(
            (report) => getDailyProgressStatusKey(report) === column.key,
          );

          return nextColumns;
        },
        {},
      ),
    [kanbanReports],
  );

  const boardSyncKey = useMemo(
    () =>
      kanbanReports
        .map(
          (report) =>
            `${report.id}:${report.status}:${report.lateApprovalStatus ?? "none"}`,
        )
        .join("|"),
    [kanbanReports],
  );

  const visibleSummary = useMemo(
    () => ({
      requiredEmployees: summary.requiredEmployees,
      submittedCount: kanbanReports.filter(
        (report) => getDailyProgressStatusKey(report) === "Submitted",
      ).length,
      latePendingCount: kanbanReports.filter(
        (report) => getDailyProgressStatusKey(report) === "Late Pending",
      ).length,
      missedCount: kanbanReports.filter(
        (report) => getDailyProgressStatusKey(report) === "Missed",
      ).length,
    }),
    [kanbanReports, summary.requiredEmployees],
  );

  function handleViewChange(value: string) {
    const nextView = value as "kanban" | "table";
    setActiveView(nextView);

    if (nextView === "kanban" && dateFilter === "all") {
      setDateFilter(boardDate);
    }
  }

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

  function startReviewDraft(
    reportId: number,
    decision: DailyProgressReviewDecision,
  ) {
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

  function handleReview(reportId: number, decision: DailyProgressReviewDecision) {
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
  }: {
    activeContainer: string;
    overContainer: string;
    activeIndex: number;
  }) {
    if (isPending || activeContainer === overContainer) {
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
    <div
      className={cn(
        KANBAN_BOARD_PAGE_CLASS,
        "h-auto min-h-full gap-4 overflow-y-auto pb-8 lg:h-full lg:min-h-0 lg:gap-6 lg:overflow-hidden lg:pb-0",
      )}
    >
      <AdminDailyProgressToolbar
        missedDate={missedDate}
        recentDateOptions={recentDateOptions}
        isPending={isPending}
        canAddOwnReport={Boolean(ownDailyProgressData)}
        showOwnProgressForm={showOwnProgressForm}
        onMissedDateChange={setMissedDate}
        onRunChecker={handleMarkMissed}
        onToggleOwnProgressForm={() =>
          setShowOwnProgressForm((current) => !current)
        }
      />

      {ownDailyProgressData && showOwnProgressForm ? (
        <EmployeeDailyProgressDashboard {...ownDailyProgressData} />
      ) : null}

      <AdminDailyProgressSummaryCards {...visibleSummary} />

      <Tabs
        value={activeView}
        onValueChange={handleViewChange}
        className={cn(
          KANBAN_BOARD_TABS_CLASS,
          "h-auto min-h-0 flex-none gap-4 overflow-visible lg:h-full lg:flex-1 lg:overflow-hidden",
        )}
      >
        <AdminDailyProgressViewControls
          activeView={activeView}
          employeeFilter={employeeFilter}
          statusFilter={statusFilter}
          dateFilter={dateFilter}
          employeeOptions={employeeOptions}
          reportDateOptions={reportDateOptions}
          boardDate={boardDate}
          onEmployeeFilterChange={setEmployeeFilter}
          onStatusFilterChange={setStatusFilter}
          onDateFilterChange={setDateFilter}
        />

        <TabsContent
          value="kanban"
          className={cn(
            KANBAN_BOARD_TAB_PANEL_CLASS,
            "overflow-visible lg:overflow-hidden",
          )}
        >
          <AdminDailyProgressKanbanBoard
            columns={columns}
            boardSyncKey={boardSyncKey}
            isPending={isPending}
            reviewDrafts={{
              reviewNotesById,
              awardPointsById,
              reviewDecisionById,
            }}
            onMove={handleMove}
            onOpenReportDetails={openReportDetails}
            onStartReview={startReviewDraft}
            onCancelReview={cancelReviewDraft}
            onReviewNotesChange={updateReviewNotes}
            onAwardPointsChange={updateAwardPoints}
            onReview={handleReview}
          />
        </TabsContent>

        <TabsContent
          value="table"
          className={cn(
            KANBAN_BOARD_TAB_PANEL_CLASS,
            "overflow-visible lg:overflow-hidden",
          )}
        >
          <AdminDailyProgressTable
            reports={filteredReports}
            reviewNotesById={reviewNotesById}
            awardPointsById={awardPointsById}
            isPending={isPending}
            onReviewNotesChange={updateReviewNotes}
            onAwardPointsChange={updateAwardPoints}
            onReview={handleReview}
          />
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
