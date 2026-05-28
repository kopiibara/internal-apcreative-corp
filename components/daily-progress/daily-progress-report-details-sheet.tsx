"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { DailyProgressStatusBadge } from "@/components/daily-progress/daily-progress-status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { RichTextRenderer } from "@/components/ui/rich-text-renderer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import type { DailyProgressReportRecord } from "@/lib/daily-progress-report/daily-progress-report"
import { cn } from "@/lib/utils"

type DailyProgressReportDetailsSheetProps = {
    report: DailyProgressReportRecord | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function getDailyProgressTone(report: DailyProgressReportRecord) {
    if (report.status === "Submitted") {
        return "green" as const
    }

    if (report.status === "Late" && report.lateApprovalStatus === "Pending") {
        return "yellow" as const
    }

    if (report.status === "Missed") {
        return "red" as const
    }

    return "blue" as const
}

function DetailSection({
    title,
    children,
    className,
}: {
    title: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <Card className={cn("gap-0 py-0 shadow-none", className)}>
            <CardHeader className="items-center border-b-2 border-border px-4 py-3">
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">{children}</CardContent>
        </Card>
    )
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
    )
}

function RichTextBlock({
    value,
    fallback,
}: {
    value: string | null | undefined
    fallback?: string | null
}) {
    if (!value?.trim()) {
        return (
            <p className="text-sm text-muted-foreground">
                {fallback || "No daily progress report submitted."}
            </p>
        )
    }

    return (
        <div
            className={cn(
                "text-sm leading-relaxed text-foreground",
                "[&_ul]:list-disc [&_ul]:pl-5",
                "[&_ol]:list-decimal [&_ol]:pl-5",
                "[&_li]:my-1 [&_p]:my-0",
            )}
        >
            <RichTextRenderer value={value} />
        </div>
    )
}

export function DailyProgressReportDetailsSheet({
    report,
    open,
    onOpenChange,
}: DailyProgressReportDetailsSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden px-4 sm:w-[50vw]! sm:max-w-4xl!">
                <SheetHeader className="shrink-0 pb-4">
                    {report ? (
                        <>
                            <SheetTitle className="flex flex-wrap items-center gap-3 font-medium">
                                <span className="text-xl font-bold sm:text-2xl">
                                    Daily Progress Report #{report.id}
                                </span>
                                <DailyProgressStatusBadge
                                    label={report.status}
                                    tone={getDailyProgressTone(report)}
                                />
                            </SheetTitle>
                            <SheetDescription>
                                View employee submission details, status, points, deductions, and
                                review notes.
                            </SheetDescription>
                        </>
                    ) : (
                        <>
                            <SheetTitle className="font-medium">
                                Daily Progress Report Details
                            </SheetTitle>
                            <SheetDescription>
                                Select a report to view its details.
                            </SheetDescription>
                        </>
                    )}
                </SheetHeader>

                {report ? (
                    <ScrollArea className="h-0 min-h-0 flex-1 pr-3">
                        <div className="grid min-w-0 grid-cols-1 gap-4 pb-6 xl:grid-cols-[2fr_1fr]">
                            <div className="min-w-0 space-y-4">
                                <DetailSection title="Submitted report">
                                    <EmployeeIdentity report={report} />

                                    <DetailField label="Summary">
                                        <div className="rounded-lg border-2 border-border bg-muted/20 p-3">
                                            <RichTextBlock
                                                value={report.summary}
                                                fallback={report.excusedReason}
                                            />
                                        </div>
                                    </DetailField>

                                    {report.proofLink ? (
                                        <Button
                                            asChild
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-fit w-fit items-center gap-1.5 py-1 text-xs"
                                        >
                                            <Link
                                                href={report.proofLink}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <ExternalLink className="size-3" />
                                                Open proof
                                            </Link>
                                        </Button>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No proof link submitted.
                                        </p>
                                    )}
                                </DetailSection>

                                {(report.lateReason ||
                                    report.lateApprovalStatus ||
                                    report.lateReviewNotes) && (
                                        <DetailSection title="Late report review">
                                            {report.lateReason ? (
                                                <DetailField label="Late reason">
                                                    <p className="whitespace-pre-wrap">
                                                        {report.lateReason}
                                                    </p>
                                                </DetailField>
                                            ) : null}

                                            {report.lateApprovalStatus ? (
                                                <DetailField label="Late approval status">
                                                    {report.lateApprovalStatus}
                                                </DetailField>
                                            ) : null}

                                            {report.lateReviewNotes ? (
                                                <DetailField label="Review notes">
                                                    <p className="whitespace-pre-wrap">
                                                        {report.lateReviewNotes}
                                                    </p>
                                                </DetailField>
                                            ) : null}
                                        </DetailSection>
                                    )}
                            </div>

                            <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
                                <DetailSection title="Report details">
                                    <div className="space-y-4">
                                        <DetailField label="Employee">
                                            <div className="space-y-0.5">
                                                <p className="font-medium">{report.employeeName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {report.employeeEmail}
                                                </p>
                                            </div>
                                        </DetailField>

                                        <DetailField label="Brand">
                                            {report.brandName ?? "No brand"}
                                        </DetailField>

                                        <DetailField label="Report date">
                                            <span className="font-mono">{report.reportDate}</span>
                                        </DetailField>

                                        <DetailField label="Status">
                                            <DailyProgressStatusBadge
                                                label={report.status}
                                                tone={getDailyProgressTone(report)}
                                            />
                                        </DetailField>

                                        <DetailField label="Late status">
                                            {report.lateApprovalStatus ?? "-"}
                                        </DetailField>
                                    </div>
                                </DetailSection>

                                <DetailSection title="Points">
                                    <div className="space-y-4">
                                        <DetailField label="Points awarded">
                                            <span className="font-black tabular-nums">
                                                {report.pointsAwarded}
                                            </span>
                                        </DetailField>

                                        <DetailField label="Deduction applied">
                                            <span className="font-black tabular-nums">
                                                {report.deductionApplied}
                                            </span>
                                        </DetailField>

                                        <DetailField label="Net points">
                                            <span className="font-black tabular-nums">
                                                {report.netPoints > 0 ? "+" : ""}
                                                {report.netPoints}
                                            </span>
                                        </DetailField>
                                    </div>
                                </DetailSection>
                            </aside>
                        </div>
                    </ScrollArea>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}