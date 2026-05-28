"use client";

import {
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { submitDailyProgressReport } from "@/app/employee/daily-progress/actions";
import type { lateReasonCategories } from "@/app/employee/daily-progress/schema";
import { DailyProgressReportDetailsSheet } from "@/components/daily-progress/daily-progress-report-details-sheet";
import { DailyProgressStatusBadge } from "@/components/daily-progress/daily-progress-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function ReportStatusCard({
  title,
  report,
}: {
  title: string;
  report?: DailyProgressReportRecord;
}) {
  const status = getReportLabel(report);

  return (
    <div className="min-w-0 rounded-lg border-2 border-border bg-white dark:bg-gray-900 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{title}</p>
        <DailyProgressStatusBadge label={status.label} tone={status.tone} />
      </div>

      {report ? (
        <p className="mt-2 font-bold tabular-nums">
          Daily Points: {report.netPoints > 0 ? "+" : ""}
          {report.netPoints}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Not submitted.</p>
      )}
    </div>
  );
}

function getRecentDateOptions(todayDateKey: string, startDateKey: string, days = 14) {
  const anchorDate = new Date(`${todayDateKey}T12:00:00+08:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(anchorDate);
    date.setUTCDate(anchorDate.getUTCDate() - index);

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(date);
  }).filter((dateKey) => dateKey >= startDateKey);
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
      <p className="text-sm text-muted-foreground">
        {fallback || "No summary."}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "text-sm text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0 [&_p]:my-0",
        compact && "line-clamp-3",
      )}
    >
      <RichTextRenderer value={value} />
    </div>
  );
}

function DailyProgressHistory({
  reports,
  onReportClick,
}: {
  reports: DailyProgressReportRecord[];
  onReportClick: (report: DailyProgressReportRecord) => void;
}) {
  if (reports.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
        No Daily Progress history yet.
      </p>
    );
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLElement>,
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
        {reports.map((report) => {
          const status = getReportLabel(report);

          /**
           * This makes the card LOOK disabled,
           * but it is still clickable and keyboard accessible.
           *
           * Do not use disabled={true} here.
           */
          const isVisuallyDisabled =
            report.status === "Missed" ||
            report.status === "Late" ||
            report.status === "Excused";

          return (
            <article
              key={report.id}
              role="button"
              tabIndex={0}
              aria-disabled={isVisuallyDisabled}
              onClick={() => onReportClick(report)}
              onKeyDown={(event) => handleCardKeyDown(event, report)}
              className={cn(
                "min-w-0 rounded-lg border-2 border-border bg-white dark:bg-gray-900 p-4 text-left transition",
                "cursor-pointer hover:-translate-y-0.5 hover:bg-muted/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isVisuallyDisabled && "opacity-70 grayscale-[0.2]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-muted-foreground">
                    {report.reportDate}
                  </p>
                  <h3 className="truncate text-sm font-black">
                    {report.brandName ?? "No brand"}
                  </h3>
                </div>

                <DailyProgressStatusBadge
                  label={status.label}
                  tone={status.tone}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-lg border-2 border-border px-2 py-1">
                  Points {report.netPoints > 0 ? "+" : ""}
                  {report.netPoints}
                </span>
                <span className="rounded-lg border-2 border-border px-2 py-1">
                  Awarded {report.pointsAwarded}
                </span>
                <span className="rounded-lg border-2 border-border px-2 py-1">
                  Deducted {report.deductionApplied}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <DailyProgressSummaryPreview
                  value={report.summary}
                  fallback={report.excusedReason}
                  compact
                />

                {report.blockers ? (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Blockers:
                    </span>{" "}
                    {richTextExcerpt(report.blockers, 120)}
                  </p>
                ) : null}

                {report.lateReason ? (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Reason:
                    </span>{" "}
                    {report.lateReason}
                  </p>
                ) : null}

                {report.lateReviewNotes ? (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Supervisor Note:
                    </span>{" "}
                    {report.lateReviewNotes}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function EmployeeDailyProgressDashboard({
  todayDateKey,
  yesterdayDateKey,
  historyStartDateKey,
  brands,
  reports,
}: EmployeeDailyProgressDashboardProps) {
  const [reportDate, setReportDate] = useState(todayDateKey);
  const [brandId, setBrandId] = useState(
    brands.length === 1 ? String(brands[0]?.id) : "none",
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

  const todayReport = useMemo(
    () => reports.find((report) => report.reportDate === todayDateKey),
    [reports, todayDateKey],
  );

  const yesterdayReport = useMemo(
    () => reports.find((report) => report.reportDate === yesterdayDateKey),
    [reports, yesterdayDateKey],
  );

  const isLateRequest = reportDate < todayDateKey;

  const selectedReport = useMemo(
    () => reports.find((report) => report.reportDate === reportDate),
    [reportDate, reports],
  );

  const canEditSelectedReport =
    reportDate === todayDateKey && selectedReport?.status === "Submitted";

  const isSelectedPastReportLocked =
    reportDate < todayDateKey && Boolean(selectedReport);

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

    const nextReport = reports.find((report) => report.reportDate === nextDate);

    if (nextReport) {
      setBrandId(nextReport.brandId ? String(nextReport.brandId) : "none");
      setSummary(nextReport.summary ?? "");
      setBlockers(nextReport.blockers ?? "");
      setProofLink(nextReport.proofLink ?? "");
      setLateReason(nextReport.lateReason ?? "");
      return;
    }

    setSummary("");
    setBlockers("");
    setProofLink("");
    setLateReason("");
    setLateReasonCategory("Late Submit");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitDailyProgressReport({
        reportDate,
        brandId: brandId === "none" ? null : Number(brandId),
        summary,
        blockers,
        proofLink,
        lateReasonCategory: isLateRequest ? lateReasonCategory : null,
        lateReason,
      });

      if (result.success) {
        toast.success(result.message);
        setSummary("");
        setBlockers("");
        setProofLink("");
        setLateReason("");
        setLateReasonCategory("Late Submit");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">
          Daily Progress Report
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Submit today for +10 points, or request approval for previous dates.
        </p>
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0 shadow-none">
          <CardHeader>
            <CardTitle>Daily Progress History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <aside className="grid gap-3 sm:grid-cols-2">
                <ReportStatusCard title="Today" report={todayReport} />
                <ReportStatusCard title="Yesterday" report={yesterdayReport} />
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

        <Card className="min-w-0 shadow-none">
          <CardHeader>
            <CardTitle>Submit Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel required>Report date</RequiredLabel>
                <Select value={reportDate} onValueChange={handleReportDateChange}>
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
                    Today&apos;s report is already submitted. You can edit it until
                    the day ends.
                  </p>
                ) : null}

                {isSelectedPastReportLocked ? (
                  <p className="text-xs font-semibold text-destructive">
                    This report is locked because it is no longer the same day.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <RequiredLabel>Brand</RequiredLabel>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger disabled={isSelectedPastReportLocked}>
                    <SelectValue placeholder="No brand selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brand</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {brand.name}
                        {brand.isPrimary ? " (Primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <RequiredLabel required>Proof link</RequiredLabel>
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
                  Previous-date reports require supervisor approval before points
                  are awarded.
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full gap-2 md:w-fit"
              disabled={isPending || isSelectedPastReportLocked}
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
