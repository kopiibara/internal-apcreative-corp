import {
  RichTextPreview,
} from "@/components/ui/rich-text-renderer";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report";

export function DailyProgressSummaryPreview({
  value,
  fallback,
  compact = false,
  onSeeMore,
}: {
  value: string | null | undefined;
  fallback?: string | null;
  compact?: boolean;
  onSeeMore?: () => void;
}) {
  if (!value?.trim()) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        {fallback || "-"}
      </p>
    );
  }

  return (
    <RichTextPreview
      value={value}
      className="mt-2 text-sm"
      maxHeightClass={compact ? "max-h-12" : undefined}
      onSeeMore={onSeeMore}
    />
  );
}

export function DailyProgressEmployeeIdentity({
  report,
}: {
  report: DailyProgressReportRecord;
}) {
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
