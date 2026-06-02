import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";

import { DailyProgressStatusBadge } from "@/components/daily-progress/daily-progress-status-badge";
import {
  DailyProgressEmployeeIdentity,
  DailyProgressSummaryPreview,
} from "@/components/daily-progress/admin-daily-progress-report-preview";
import type { DailyProgressReviewDecision } from "@/types/admin-daily-progress-types";
import { getDailyProgressTone } from "@/lib/admin-daily-progress-utils";
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area";
import { KANBAN_BOARD_MAX_HEIGHT_CLASS } from "@/components/shared/kanban-board-scroll";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report";
import { cn } from "@/lib/utils";

export function AdminDailyProgressTable({
  reports,
  reviewNotesById,
  awardPointsById,
  isPending,
  onReviewNotesChange,
  onAwardPointsChange,
  onReview,
}: {
  reports: DailyProgressReportRecord[];
  reviewNotesById: Record<number, string>;
  awardPointsById: Record<number, string>;
  isPending: boolean;
  onReviewNotesChange: (reportId: number, value: string) => void;
  onAwardPointsChange: (reportId: number, value: string) => void;
  onReview: (reportId: number, decision: DailyProgressReviewDecision) => void;
}) {
  return (
    <DataTableScrollArea
      fill
      scrollbars="both"
      className={cn(
        "min-h-[320px] bg-card text-card-foreground",
        KANBAN_BOARD_MAX_HEIGHT_CLASS,
      )}
      viewportClassName="max-w-full [&>div]:min-w-max"
    >
      <Table className="min-w-[760px] border-0 text-xs sm:min-w-[900px] sm:text-sm">
        <TableHeader className={DATA_TABLE_HEADER_CLASS}>
          <TableRow className="bg-card text-card-foreground">
            <TableHead className="sticky left-0 z-30 min-w-[11rem] bg-card px-3 text-foreground sm:min-w-[14rem] sm:px-4">
              Employee
            </TableHead>
            <TableHead className="hidden min-w-[8rem] px-3 text-foreground lg:table-cell">
              Brand
            </TableHead>
            <TableHead className="min-w-[6.75rem] px-3 text-foreground">
              Date
            </TableHead>
            <TableHead className="min-w-[6.5rem] px-3 text-foreground">
              Status
            </TableHead>
            <TableHead className="hidden min-w-[6.5rem] px-3 text-foreground md:table-cell">
              Late Status
            </TableHead>
            <TableHead className="min-w-[12rem] px-3 text-foreground sm:min-w-[16rem]">
              Summary
            </TableHead>
            <TableHead className="min-w-[5.5rem] px-3 text-right text-foreground">
              Points
            </TableHead>
            <TableHead className="min-w-[10rem] px-3 text-foreground sm:min-w-[14rem]">
              Review
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className={DATA_TABLE_BODY_CLASS}>
          {reports.length === 0 ? (
            <TableRow className="bg-card text-card-foreground">
              <TableCell
                colSpan={8}
                className="h-32 p-4 text-center text-muted-foreground"
              >
                No Daily Progress Reports found.
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow
                key={report.id}
                className="bg-card text-card-foreground hover:bg-muted/30"
              >
                <TableCell className="sticky left-0 z-10 bg-card p-3 sm:p-4">
                  <DailyProgressEmployeeIdentity report={report} />
                </TableCell>

                <TableCell className="hidden max-w-[9rem] truncate p-3 text-muted-foreground lg:table-cell">
                  {report.brandName ?? "No brand"}
                </TableCell>

                <TableCell className="whitespace-nowrap p-3 font-mono text-xs">
                  {report.reportDate}
                </TableCell>

                <TableCell className="p-3">
                  <DailyProgressStatusBadge
                    label={report.status}
                    tone={getDailyProgressTone(report)}
                  />
                </TableCell>

                <TableCell className="hidden p-3 text-muted-foreground md:table-cell">
                  {report.lateApprovalStatus ?? "-"}
                </TableCell>

                <TableCell className="max-w-[12rem] p-3 sm:max-w-xs">
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
                      <Link href={report.proofLink} target="_blank" rel="noreferrer">
                        Proof <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  ) : null}
                </TableCell>

                <TableCell className="p-3 text-right tabular-nums">
                  <p className="font-black">{report.netPoints}</p>
                  {report.deductionApplied > 0 ? (
                    <p className="text-xs text-destructive">
                      -{report.deductionApplied} late
                    </p>
                  ) : null}
                </TableCell>

                <TableCell className="p-3">
                  {report.status === "Late" &&
                  report.lateApprovalStatus === "Pending" ? (
                    <div className="grid min-w-56 gap-2 sm:min-w-64">
                      <p className="text-xs text-muted-foreground">
                        Reason: {report.lateReason}
                      </p>

                      <Textarea
                        value={reviewNotesById[report.id] ?? ""}
                        onChange={(event) =>
                          onReviewNotesChange(report.id, event.target.value)
                        }
                        rows={2}
                        placeholder="Review note"
                      />

                      <Select
                        value={awardPointsById[report.id] ?? "5"}
                        onValueChange={(value) =>
                          onAwardPointsChange(report.id, value)
                        }
                      >
                        <SelectTrigger aria-label="Points awarded">
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

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1"
                          disabled={isPending}
                          onClick={() => onReview(report.id, "Approved")}
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
                          onClick={() => onReview(report.id, "Rejected")}
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
    </DataTableScrollArea>
  );
}
