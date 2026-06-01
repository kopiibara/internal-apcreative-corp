import { RichTextRenderer } from "@/components/ui/rich-text-renderer";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report";
import { cn } from "@/lib/utils";

export function DailyProgressSummaryPreview({
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
