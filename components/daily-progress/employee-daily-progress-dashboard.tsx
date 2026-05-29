"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { submitDailyProgressReport } from "@/app/employee/daily-progress/actions";
import type { lateReasonCategories } from "@/app/employee/daily-progress/schema";
import { DailyProgressReportDetailsSheet } from "@/components/daily-progress/daily-progress-report-details-sheet";
import { DailyProgressStatusBadge } from "@/components/daily-progress/daily-progress-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RequiredLabel } from "@/components/ui/required-label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
import type {
  DailyProgressBrandOption,
  DailyProgressReportRecord,
} from "@/lib/daily-progress-report/daily-progress-report";
import { DAILY_PROGRESS_SCORING_START_DATE_KEY } from "@/lib/daily-progress-report/constants";
import { richTextExcerpt } from "@/lib/rich-text/rich-text";
import { cn } from "@/lib/utils";

export type EmployeeDailyProgressDashboardProps = {
  todayDateKey: string;
  yesterdayDateKey: string;
  historyStartDateKey: string;
  brands: DailyProgressBrandOption[];
  reports: DailyProgressReportRecord[];
};

type LateReasonCategory = (typeof lateReasonCategories)[number];

type DailyProgressReportGroup = {
  reportDate: string;
  reports: DailyProgressReportRecord[];
};

const LATE_REASON_OPTIONS: LateReasonCategory[] = [
  "On Leave",
  "Blockers",
  "Late Submit",
  "Others",
];

function getReportLabel(report?: DailyProgressReportRecord) {
  if (!report) {
    return { label: "Not submitted yet", tone: "neutral" as const };
  }

  if (report.status === "Late" && report.lateApprovalStatus === "Pending") {
    return { label: "Late Report Pending Approval", tone: "yellow" as const };
  }

  if (report.status === "Late" && report.lateApprovalStatus === "Approved") {
    return { label: "Late Report Approved", tone: "green" as const };
  }

  if (report.status === "Missed" && report.lateApprovalStatus === "Rejected") {
    return { label: "Late Report Rejected", tone: "red" as const };
  }

  if (report.status === "Missed") {
    return { label: "Missed", tone: "red" as const };
  }

  if (report.status === "Excused") {
    return {
      label: report.excusedReason ?? "Excused",
      tone: "blue" as const,
    };
  }

  return { label: "Submitted", tone: "green" as const };
}

function getDateSummaryLabel(reports: DailyProgressReportRecord[]) {
  if (reports.length === 0) {
    return { label: "Not submitted yet", tone: "neutral" as const };
  }

  const pendingLateCount = reports.filter(
    (report) =>
      report.status === "Late" && report.lateApprovalStatus === "Pending",
  ).length;

  const submittedCount = reports.filter(
    (report) =>
      report.status === "Submitted" ||
      (report.status === "Late" && report.lateApprovalStatus === "Approved"),
  ).length;

  const rejectedCount = reports.filter(
    (report) =>
      report.status === "Missed" && report.lateApprovalStatus === "Rejected",
  ).length;

  const missedCount = reports.filter(
    (report) => report.status === "Missed",
  ).length;

  if (pendingLateCount > 0) {
    return {
      label: `${pendingLateCount} pending approval`,
      tone: "yellow" as const,
    };
  }

  if (rejectedCount > 0) {
    return {
      label: `${rejectedCount} rejected`,
      tone: "red" as const,
    };
  }

  if (missedCount > 0) {
    return {
      label: `${missedCount} missed`,
      tone: "red" as const,
    };
  }

  return {
    label: `${submittedCount} submitted`,
    tone: "green" as const,
  };
}

function ReportStatusCard({
  title,
  reports,
}: {
  title: string;
  reports: DailyProgressReportRecord[];
}) {
  const status = getDateSummaryLabel(reports);
  const totalPoints = reports.reduce(
    (total, report) => total + report.netPoints,
    0,
  );

  return (
    <div className="min-w-0 rounded-lg border-2 border-border bg-white p-4 text-sm dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{title}</p>
        <DailyProgressStatusBadge label={status.label} tone={status.tone} />
      </div>

      {reports.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="font-bold tabular-nums">
            Daily Points: {totalPoints > 0 ? "+" : ""}
            {totalPoints}
          </p>
          <p className="text-xs text-muted-foreground">
            {reports.length} report{reports.length > 1 ? "s" : ""} recorded.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Not submitted.</p>
      )}
    </div>
  );
}

function getRecentDateOptions(
  todayDateKey: string,
  startDateKey: string,
  days = 14,
) {
  const anchorDate = new Date(`${todayDateKey}T12:00:00+08:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(anchorDate);
    date.setUTCDate(anchorDate.getUTCDate() - index);

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(date);
  }).filter((dateKey) => dateKey >= startDateKey);
}



function groupDailyProgressReports(
  reports: DailyProgressReportRecord[],
): DailyProgressReportGroup[] {
  const groups = new Map<string, DailyProgressReportRecord[]>();

  for (const report of reports) {
    const currentReports = groups.get(report.reportDate) ?? [];
    currentReports.push(report);
    groups.set(report.reportDate, currentReports);
  }

  return Array.from(groups.entries())
    .map(([reportDate, groupedReports]) => ({
      reportDate,
      reports: groupedReports,
    }))
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

function DailyProgressHistory({
  reports,
  onReportClick,
}: {
  reports: DailyProgressReportRecord[];
  onReportClick: (report: DailyProgressReportRecord) => void;
}) {
  const groupedReports = groupDailyProgressReports(reports);

  if (groupedReports.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
        No Daily Progress history yet.
      </p>
    );
  }

  function handleBrandButtonKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    report: DailyProgressReportRecord,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onReportClick(report);
    }
  }

  return (
    <ScrollArea className="h-[60vh] pr-3" scrollbars="vertical">
      <div className="grid gap-3 pr-3">
        {groupedReports.map((group) => {
          const firstReport = group.reports[0];
          const status = getDateSummaryLabel(group.reports);

          const totalPoints = group.reports.reduce(
            (total, report) => total + report.netPoints,
            0,
          );

          const totalAwarded = group.reports.reduce(
            (total, report) => total + report.pointsAwarded,
            0,
          );

          const totalDeducted = group.reports.reduce(
            (total, report) => total + report.deductionApplied,
            0,
          );

          const includedBrandNames = Array.from(
            new Set(
              group.reports.flatMap((report) =>
                report.brandNames.length > 0
                  ? report.brandNames
                  : [report.brandName ?? "No brand"],
              ),
            ),
          );
          const brandCount = includedBrandNames.length;

          return (
            <article
              key={group.reportDate}
              className={cn(
                "min-w-0 rounded-lg border-2 border-border bg-white p-4 text-left transition dark:bg-gray-900",
                "hover:bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-mono font-bold">
                    {group.reportDate}
                  </h1>


                </div>

                <DailyProgressStatusBadge
                  label={status.label}
                  tone={status.tone}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-lg border-2 border-border px-2 py-1">
                  Points {totalPoints > 0 ? "+" : ""}
                  {totalPoints}
                </span>

                <span className="rounded-lg border-2 border-border px-2 py-1">
                  Awarded {totalAwarded}
                </span>

                <span className="rounded-lg border-2 border-border px-2 py-1">
                  Deducted {totalDeducted}
                </span>
              </div>

              <div className="mt-3 rounded-lg flex flex-col border-2 gap-2 text-sm border-border bg-muted/20 p-3">

                <div className="mt-2 flex flex-wrap gap-2">
                  {includedBrandNames.map((brandName) => (
                    <Badge
                      key={brandName}
                      className="rounded-lg border-2 border-border bg-background px-3 py-1 text-xs font-bold"
                    >
                      {brandName}
                    </Badge>
                  ))}
                </div>

                {firstReport?.blockers ? (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Blockers:
                    </span>{" "}
                    {richTextExcerpt(firstReport.blockers, 120)}
                  </p>
                ) : null}

                {firstReport?.lateReason ? (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Reason:
                    </span>{" "}
                    {firstReport.lateReason}
                  </p>
                ) : null}

                {firstReport?.lateReviewNotes ? (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Supervisor Note:
                    </span>{" "}
                    {firstReport.lateReviewNotes}
                  </p>
                ) : null}

              </div>

              <div className="mt-3 space-y-2 text-sm">
                {firstReport ? (
                  <Button
                    variant="default"
                    onClick={() => onReportClick(firstReport)}
                    onKeyDown={(event) =>
                      handleBrandButtonKeyDown(event, firstReport)
                    }

                  >
                    View report details
                  </Button>
                ) : null}

              </div>
            </article>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function reportMatchesBrand(
  report: DailyProgressReportRecord,
  brandValue: string,
) {
  if (brandValue === "none") {
    return report.brandIds.length === 0;
  }

  return report.brandIds.includes(Number(brandValue));
}

export function EmployeeDailyProgressDashboard({
  todayDateKey,
  yesterdayDateKey,
  historyStartDateKey,
  brands,
  reports,
}: EmployeeDailyProgressDashboardProps) {
  const router = useRouter();

  const [reportDate, setReportDate] = useState(todayDateKey);

  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(
    brands.length === 1 && brands[0]?.id ? [String(brands[0].id)] : ["none"],
  );

  const [summary, setSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [lateReasonCategory, setLateReasonCategory] =
    useState<LateReasonCategory>("Late Submit");
  const [lateReason, setLateReason] = useState("");
  const [selectedHistoryReport, setSelectedHistoryReport] =
    useState<DailyProgressReportRecord | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isNoBrandSelected = selectedBrandIds.includes("none");

  const reportDateOptions = useMemo(
    () =>
      getRecentDateOptions(
        todayDateKey,
        historyStartDateKey > DAILY_PROGRESS_SCORING_START_DATE_KEY
          ? historyStartDateKey
          : DAILY_PROGRESS_SCORING_START_DATE_KEY,
      ),
    [historyStartDateKey, todayDateKey],
  );

  const todayReports = useMemo(
    () => reports.filter((report) => report.reportDate === todayDateKey),
    [reports, todayDateKey],
  );

  const yesterdayReports = useMemo(
    () => reports.filter((report) => report.reportDate === yesterdayDateKey),
    [reports, yesterdayDateKey],
  );

  const isLateRequest = reportDate < todayDateKey;
  const isYesterdayRequest = reportDate === yesterdayDateKey;

  const selectedDateReport = useMemo(
    () => reports.find((report) => report.reportDate === reportDate) ?? null,
    [reportDate, reports],
  );

  useEffect(() => {
    if (!selectedDateReport) {
      setSummary("");
      setBlockers("");
      setProofLink("");
      setLateReason("");
      setLateReasonCategory("Late Submit");
      return;
    }

    setSummary(selectedDateReport.summary ?? "");
    setBlockers(selectedDateReport.blockers ?? "");
    setProofLink(selectedDateReport.proofLink ?? "");
    setLateReason(selectedDateReport.lateReason ?? "");

    if (
      selectedDateReport.lateReason === "On Leave" ||
      selectedDateReport.lateReason === "Blockers" ||
      selectedDateReport.lateReason === "Late Submit"
    ) {
      setLateReasonCategory(selectedDateReport.lateReason);
    } else if (selectedDateReport.lateReason?.startsWith("Others:")) {
      setLateReasonCategory("Others");
      setLateReason(selectedDateReport.lateReason.replace(/^Others:\s*/, ""));
    } else {
      setLateReasonCategory("Late Submit");
    }

    setSelectedBrandIds(
      selectedDateReport.brandIds.length > 0
        ? selectedDateReport.brandIds.map((brandId) => String(brandId))
        : ["none"],
    );
  }, [selectedDateReport]);

  const selectedReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report.reportDate === reportDate &&
          selectedBrandIds.some((brandValue) =>
            reportMatchesBrand(report, brandValue),
          ),
      ),
    [reportDate, reports, selectedBrandIds],
  );

  const selectedBrandReports = useMemo(
    () =>
      selectedBrandIds.map((brandValue) => ({
        brandValue,
        report: reports.find(
          (report) =>
            report.reportDate === reportDate &&
            reportMatchesBrand(report, brandValue),
        ),
      })),
    [reportDate, reports, selectedBrandIds],
  );

  const lockedSelectedBrandReports = selectedBrandReports.filter(
    ({ report }) => {
      if (reportDate === todayDateKey) {
        return false;
      }

      if (!isYesterdayRequest) {
        return true;
      }

      if (!report) {
        return false;
      }

      return !(
        report.status === "Missed" &&
        report.lateApprovalStatus !== "Rejected"
      );
    },
  );

  const canEditSelectedReport =
    reportDate === todayDateKey &&
    selectedReports.some((report) => report.status === "Submitted");

  const canSubmitLateRequestForSelectedReport =
    isYesterdayRequest &&
    selectedBrandIds.length > 0 &&
    lockedSelectedBrandReports.length === 0;

  const isSelectedPastReportLocked =
    reportDate < todayDateKey && lockedSelectedBrandReports.length > 0;

  function handleBrandToggle(
    value: string,
    checked: boolean | "indeterminate",
  ) {
    const isChecked = checked === true;

    if (value === "none") {
      setSelectedBrandIds(isChecked ? ["none"] : []);
      return;
    }

    setSelectedBrandIds((current) => {
      const withoutNoBrand = current.filter((id) => id !== "none");

      if (isChecked) {
        return Array.from(new Set([...withoutNoBrand, value]));
      }

      return withoutNoBrand.filter((id) => id !== value);
    });
  }

  function openReportDetails(report: DailyProgressReportRecord) {
    setSelectedHistoryReport(report);
    setIsDetailsSheetOpen(true);
  }

  function handleDetailsSheetOpenChange(nextOpen: boolean) {
    setIsDetailsSheetOpen(nextOpen);

    if (!nextOpen) {
      setSelectedHistoryReport(null);
    }
  }

  function handleReportDateChange(nextDate: string) {
    setReportDate(nextDate);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (selectedBrandIds.length === 0) {
        toast.error("Please select at least one brand or No brand.");
        return;
      }

      const result = await submitDailyProgressReport({
        reportDate,
        brandIds: isNoBrandSelected
          ? []
          : selectedBrandIds.map((id) => Number(id)),
        summary,
        blockers,
        proofLink,
        lateReasonCategory: isLateRequest ? lateReasonCategory : null,
        lateReason,
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
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0 shadow-none">
          <CardHeader>
            <CardTitle>Daily Progress History</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4">
              <aside className="grid gap-3 sm:grid-cols-2">
                <ReportStatusCard title="Today" reports={todayReports} />
                <ReportStatusCard
                  title="Yesterday"
                  reports={yesterdayReports}
                />
              </aside>

              <section className="min-w-0 space-y-3">
                <DailyProgressHistory
                  reports={reports}
                  onReportClick={openReportDetails}
                />
              </section>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Submit Progress</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel required>Report date</RequiredLabel>

                <Select
                  value={reportDate}
                  onValueChange={handleReportDateChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {reportDateOptions.map((dateKey) => (
                      <SelectItem key={dateKey} value={dateKey}>
                        {dateKey === todayDateKey
                          ? `Today (${dateKey})`
                          : dateKey === yesterdayDateKey
                            ? `Yesterday (${dateKey})`
                            : dateKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {canEditSelectedReport ? (
                  <p className="text-xs font-semibold text-muted-foreground">
                    Today&apos;s report is already submitted for one or more
                    selected brands. You can edit it until the day ends.
                  </p>
                ) : null}

                {isSelectedPastReportLocked ? (
                  <p className="text-xs font-semibold text-destructive">
                    This report is locked. You can only submit today&apos;s
                    report or request approval for yesterday&apos;s missed
                    report. One or more selected brands already have a locked
                    report for this date.
                  </p>
                ) : null}

                {canSubmitLateRequestForSelectedReport &&
                  isYesterdayRequest ? (
                  <p className="text-xs font-semibold text-amber-700">
                    Yesterday&apos;s report will be submitted as a late request
                    and requires supervisor approval.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <RequiredLabel required>Brand</RequiredLabel>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border bg-white p-3 text-xs font-semibold transition",
                      "hover:bg-muted/30",
                      isNoBrandSelected && "bg-blue-50 ring-2 ring-blue-700",
                      isSelectedPastReportLocked &&
                      "cursor-not-allowed opacity-60",
                    )}
                  >
                    <Checkbox
                      checked={isNoBrandSelected}
                      disabled={isSelectedPastReportLocked}
                      onCheckedChange={(checked) =>
                        handleBrandToggle("none", checked)
                      }
                    />
                    <span>No brand</span>
                  </label>

                  {brands.map((brand) => {
                    const value = String(brand.id);
                    const isChecked = selectedBrandIds.includes(value);

                    return (
                      <label
                        key={brand.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border bg-white p-3 text-xs font-semibold transition",
                          "hover:bg-muted/30",
                          isChecked && "bg-blue-50 ring-2 ring-blue-700",
                          isSelectedPastReportLocked &&
                          "cursor-not-allowed opacity-60",
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isSelectedPastReportLocked}
                          onCheckedChange={(checked) =>
                            handleBrandToggle(value, checked)
                          }
                        />

                        <span>
                          {brand.name}
                          {brand.isPrimary ? " (Primary)" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <RichTextEditor
              id="daily-progress-summary"
              label="Summary"
              required
              value={summary}
              onChange={setSummary}
              disabled={isSelectedPastReportLocked}
              minHeight={180}
              placeholder="What did you complete or move forward today?"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <RichTextEditor
                id="daily-progress-blockers"
                label="Blockers"
                value={blockers}
                onChange={setBlockers}
                disabled={isSelectedPastReportLocked}
                minHeight={130}
                placeholder="Optional"

              />

              <div className="space-y-2">
                <RequiredLabel>Proof link</RequiredLabel>

                <Input
                  value={proofLink}
                  onChange={(event) => setProofLink(event.target.value)}
                  disabled={isSelectedPastReportLocked}
                  placeholder="https://..."
                />
              </div>
            </div>

            {isLateRequest ? (
              <div className="space-y-2 rounded-lg border-2 border-border bg-yellow-100 p-3">
                <RequiredLabel required>
                  Reason for previous-date report
                </RequiredLabel>

                <Select
                  value={lateReasonCategory}
                  onValueChange={(value) =>
                    setLateReasonCategory(value as LateReasonCategory)
                  }
                  disabled={isSelectedPastReportLocked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {LATE_REASON_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {lateReasonCategory === "Others" ? (
                  <div className="space-y-2">
                    <RequiredLabel required>Reason details</RequiredLabel>

                    <Textarea
                      value={lateReason}
                      onChange={(event) => setLateReason(event.target.value)}
                      disabled={isSelectedPastReportLocked}
                      rows={3}
                      placeholder="Add reason details."
                    />
                  </div>
                ) : null}

                <p className="text-xs font-semibold text-muted-foreground">
                  Previous-date reports require supervisor approval before
                  points are awarded.
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full gap-2 md:w-fit"
              disabled={
                isPending ||
                isSelectedPastReportLocked ||
                selectedBrandIds.length === 0
              }
              onClick={handleSubmit}
            >
              <Send className="size-4" />
              {isPending
                ? "Saving..."
                : canEditSelectedReport
                  ? "Update Today's Report"
                  : "Submit Daily Progress Report"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <DailyProgressReportDetailsSheet
        report={selectedHistoryReport}
        open={isDetailsSheetOpen}
        onOpenChange={handleDetailsSheetOpenChange}
      />
    </div>
  );
}