import { StatusBadge } from "@/components/shared/status-badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { ContentReport } from "@/types/content-report"

type ApprovalDetailsSummaryProps = {
  report: ContentReport
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function getDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not scheduled"
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function LongText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
      <p className="whitespace-pre-wrap break-words">{children}</p>
    </div>
  )
}

export function ApprovalDetailsSummary({ report }: ApprovalDetailsSummaryProps) {
  return (
    <Card >
      <CardHeader>
        <CardTitle>Content Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Submitted By">
            <div className="space-y-0.5">
              <p>{report.submittedByName}</p>
              <p className="text-xs text-muted-foreground">
                {report.submittedByEmail}
              </p>
            </div>
          </DetailField>
          <DetailField label="Date Submitted">
            {dateFormatter.format(new Date(report.dateSubmitted))}
          </DetailField>
          <DetailField label="Brand">
            {report.brandName ?? "No brand"}
          </DetailField>
          <DetailField label="Content Type">{report.contentType}</DetailField>
          <DetailField label="Platform">{report.platform}</DetailField>
          <DetailField label="Asset Link">
            {report.assetLink ? (
              <a
                href={report.assetLink}
                target="_blank"
                rel="noreferrer"
                className="break-all underline-offset-4 hover:underline"
              >
                {report.assetLink}
              </a>
            ) : (
              <span className="text-muted-foreground">No link</span>
            )}
          </DetailField>
          <DetailField label="Scheduled / Published Date">
            {getDateLabel(report.scheduledPublishedDate)}
          </DetailField>
        </div>

        <Separator />

        <div className="space-y-4">
          <DetailField label="Content Inspo">
            <LongText>{report.contentInspo ?? "None"}</LongText>
          </DetailField>
          <DetailField label="Full Caption">
            <LongText>{report.caption}</LongText>
          </DetailField>
          <DetailField label="Employee Notes / Comments">
            <LongText>{report.employeeComments ?? "No employee comments"}</LongText>
          </DetailField>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Marketing Supervisor Status">
            <StatusBadge status={report.supervisorStatus} type="approval" />
          </DetailField>
          <DetailField label="Director of Marketing Status">
            <StatusBadge status={report.directorStatus} type="approval" />
          </DetailField>
          <DetailField label="Publish Status">
            <StatusBadge status={report.publishStatus} type="publish" />
          </DetailField>
        </div>

        <div className="space-y-4">
          <DetailField label="Marketing Supervisor Notes">
            <LongText>{report.supervisorNotes ?? "No notes"}</LongText>
          </DetailField>
          <DetailField label="Director Notes">
            <LongText>{report.directorNotes ?? "No notes"}</LongText>
          </DetailField>
          <DetailField label="Remarks / Revision Summary">
            <LongText>
              {report.remarksRevisionSummary ?? "No remarks"}
            </LongText>
          </DetailField>
        </div>
      </CardContent>
    </Card>
  )
}
