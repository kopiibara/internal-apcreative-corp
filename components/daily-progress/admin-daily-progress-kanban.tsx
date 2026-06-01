import { type KeyboardEvent, type SyntheticEvent } from "react";
import { Check, X } from "lucide-react";

import {
  DAILY_PROGRESS_STATUS_COLUMNS,
  getDailyProgressReportBrandNames,
} from "@/lib/admin-daily-progress-utils";
import {
  DailyProgressEmployeeIdentity,
  DailyProgressSummaryPreview,
} from "@/components/daily-progress/admin-daily-progress-report-preview";
import type {
  DailyProgressReviewDecision,
  DailyProgressReviewDrafts,
  DailyProgressStatusFilter,
} from "@/types/admin-daily-progress-types";
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
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header";
import {
  KanbanBoardShell,
  KANBAN_BOARD_FIT_ROW_3_CLASS,
  KANBAN_BOARD_MAX_HEIGHT_CLASS,
  KANBAN_COLUMN_CARD_CLASS,
  KANBAN_COLUMN_FIT_CLASS,
  KANBAN_COLUMN_ITEM_CLASS,
  KANBAN_OVERLAY_CLASS,
  KanbanColumnScrollArea,
  kanbanColumnListClass,
} from "@/components/shared/kanban-board-scroll";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report";
import { cn } from "@/lib/utils";

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
        "rounded-lg border-2 border-border bg-background p-3 text-left shadow-[var(--shadow-hard-sm)] transition",
        isClickable &&
        "cursor-pointer hover:-translate-y-0.5 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        muted && "opacity-70 grayscale-[0.2]",
      )}
    >
      <DailyProgressEmployeeIdentity report={report} />

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

      <div className="mt-3 rounded-lg border-2 border-border bg-muted/20 p-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Brands Included
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {getDailyProgressReportBrandNames(report).map((brandName) => (
            <span
              key={brandName}
              className="rounded-lg border-2 border-border bg-background px-2 py-1 text-xs font-bold"
            >
              {brandName}
            </span>
          ))}
        </div>
      </div>

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
  activeDecision?: DailyProgressReviewDecision;
  isPending: boolean;
  onStartReview: (reportId: number, decision: DailyProgressReviewDecision) => void;
  onCancelReview: (reportId: number) => void;
  onReviewNotesChange: (reportId: number, value: string) => void;
  onAwardPointsChange: (reportId: number, value: string) => void;
  onReview: (reportId: number, decision: DailyProgressReviewDecision) => void;
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
  id: Exclude<DailyProgressStatusFilter, "all">;
  title: string;
  count: number;
  badgeClassName: string;
  children: React.ReactNode;
}) {
  const listClassName = kanbanColumnListClass(count);
  const isEmpty = count === 0;

  return (
    <KanbanColumn value={id} className={KANBAN_COLUMN_FIT_CLASS}>
      <Card className={cn(KANBAN_COLUMN_CARD_CLASS, "bg-white shadow-none")}>
        <KanbanColumnHeader
          title={title}
          count={count}
          countClassName={badgeClassName}
        />
        <KanbanColumnScrollArea>
          <KanbanColumnContent value={id} className={listClassName}>
            {isEmpty ? (
              <p className="text-center text-xs text-muted-foreground">
                No reports here.
              </p>
            ) : (
              children
            )}
          </KanbanColumnContent>
        </KanbanColumnScrollArea>
      </Card>
    </KanbanColumn>
  );
}

export function AdminDailyProgressKanbanBoard({
  columns,
  boardSyncKey,
  isPending,
  reviewDrafts,
  onMove,
  onOpenReportDetails,
  onStartReview,
  onCancelReview,
  onReviewNotesChange,
  onAwardPointsChange,
  onReview,
}: {
  columns: Record<string, DailyProgressReportRecord[]>;
  boardSyncKey: string;
  isPending: boolean;
  reviewDrafts: DailyProgressReviewDrafts;
  onMove: (event: KanbanMoveEvent) => void;
  onOpenReportDetails: (report: DailyProgressReportRecord) => void;
  onStartReview: (reportId: number, decision: DailyProgressReviewDecision) => void;
  onCancelReview: (reportId: number) => void;
  onReviewNotesChange: (reportId: number, value: string) => void;
  onAwardPointsChange: (reportId: number, value: string) => void;
  onReview: (reportId: number, decision: DailyProgressReviewDecision) => void;
}) {
  return (
    <KanbanBoardShell
      columnLayout="fit"
      className={cn(
        "h-[min(56dvh,520px)] min-h-[360px] flex-none lg:h-full lg:min-h-0 lg:flex-1",
        KANBAN_BOARD_MAX_HEIGHT_CLASS,
      )}
    >
      <Kanban
        key={boardSyncKey}
        className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
        value={columns}
        onValueChange={() => undefined}
        getItemValue={(report) => String(report.id)}
        onMove={onMove}
      >
        <KanbanBoard className={cn(KANBAN_BOARD_FIT_ROW_3_CLASS, "min-h-0 flex-1 px-3 pb-1 sm:px-6")}>
          {DAILY_PROGRESS_STATUS_COLUMNS.map((column) => {
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

                  const cardKey = `${report.id}-${report.status}-${report.lateApprovalStatus ?? "none"}`;
                  const card = (
                    <DailyProgressKanbanCard
                      report={report}
                      muted={isDraggable ? isPending : true}
                      onClick={() => onOpenReportDetails(report)}
                    >
                      {isDraggable ? (
                        <DailyProgressKanbanReviewActions
                          report={report}
                          reviewNotes={reviewDrafts.reviewNotesById[report.id] ?? ""}
                          awardPoints={reviewDrafts.awardPointsById[report.id] ?? "5"}
                          activeDecision={reviewDrafts.reviewDecisionById[report.id]}
                          isPending={isPending}
                          onStartReview={onStartReview}
                          onCancelReview={onCancelReview}
                          onReviewNotesChange={onReviewNotesChange}
                          onAwardPointsChange={onAwardPointsChange}
                          onReview={onReview}
                        />
                      ) : null}
                    </DailyProgressKanbanCard>
                  );

                  if (!isDraggable) {
                    return (
                      <div key={cardKey} className={KANBAN_COLUMN_ITEM_CLASS}>
                        {card}
                      </div>
                    );
                  }

                  return (
                    <KanbanItem
                      key={cardKey}
                      value={String(report.id)}
                      className={KANBAN_COLUMN_ITEM_CLASS}
                    >
                      <KanbanItemHandle
                        cursor={isDraggable}
                        className={KANBAN_COLUMN_ITEM_CLASS}
                      >
                        {card}
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
  );
}
