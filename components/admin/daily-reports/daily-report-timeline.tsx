"use client"

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DailyTimelineEntry } from "@/lib/daily-reports/daily-report-types"

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

type DailyReportTimelineProps = {
  entries: DailyTimelineEntry[]
}

export function DailyReportTimeline({ entries }: DailyReportTimelineProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col gap-3 py-4 md:gap-6 md:py-6">
      <CardHeader className="px-3 md:px-6">
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-3 pt-0 md:px-6">
        <ScrollArea className="h-[320px] max-h-[320px] pr-3 md:h-[420px] md:max-h-[420px]" scrollbars="vertical">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity found for this date.
            </p>
          ) : (
            <Timeline defaultValue={entries.length} className="w-full">
              {entries.map((entry, index) => (
                <TimelineItem key={entry.id} step={index + 1}>
                  <TimelineHeader>
                    <TimelineDate>
                      {dateTimeFormatter.format(new Date(entry.createdAt))}
                    </TimelineDate>
                    <TimelineTitle>{entry.actionLabel}</TimelineTitle>
                  </TimelineHeader>
                  <TimelineIndicator />
                  <TimelineSeparator />
                  <TimelineContent className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {entry.actorName}
                      </span>
                      <StatusBadge status={entry.module} size="sm" />
                      {entry.brandName ? (
                        <StatusBadge status="BRAND" size="sm">
                          {entry.brandName}
                        </StatusBadge>
                      ) : null}
                      {entry.employeeName ? (
                        <StatusBadge status="EMPLOYEE" size="sm">
                          {entry.employeeName}
                        </StatusBadge>
                      ) : null}
                    </div>
                    {entry.detail ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                        {entry.detail}
                      </p>
                    ) : null}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
