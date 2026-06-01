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
      className={cn("min-h-0 bg-cream", KANBAN_BOARD_MAX_HEIGHT_CLASS)}
    >
      <Table className="min-w-[880px] border-0">
        <TableHeader className={cn(DATA_TABLE_HEADER_CLASS, "bg-cream")}>
          <TableRow>
            <TableHead className="sticky left-0 z-30 min-w-[200px] bg-cream">
              Employee
            </TableHead>
            <TableHead className="hidden min-w-[140px] lg:table-cell">
              Brand
            </TableHead>
            <TableHead className="min-w-[6.5rem]">Date</TableHead>
            <TableHead className="min-w-[6.5rem]">Status</TableHead>
            <TableHead className="hidden min-w-[6.5rem] md:table-cell">
              Late Status
            </TableHead>
            <TableHead className="min-w-[12rem]">Summary</TableHead>
            <TableHead className="min-w-[5.5rem] text-right">Points</TableHead>
            <TableHead className="min-w-[11rem]">Review</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className={cn(DATA_TABLE_BODY_CLASS, "bg-cream")}>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No Daily Progress Reports found.
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="sticky left-0 z-10 bg-cream">
                  <DailyProgressEmployeeIdentity report={report} />
                </TableCell>

                <TableCell className="hidden max-w-[10rem] truncate lg:table-cell">
                  {report.brandName ?? "No brand"}
                </TableCell>

                <TableCell className="font-mono text-xs">
                  {report.reportDate}
                </TableCell>

                <TableCell>
                  <DailyProgressStatusBadge
                    label={report.status}
                    tone={getDailyProgressTone(report)}
                  />
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {report.lateApprovalStatus ?? "-"}
                </TableCell>

                <TableCell className="max-w-xs">
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

                <TableCell className="text-right tabular-nums">
                  <p className="font-black">{report.netPoints}</p>
                  {report.deductionApplied > 0 ? (
                    <p className="text-xs text-destructive">
                      -{report.deductionApplied} late
                    </p>
                  ) : null}
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
