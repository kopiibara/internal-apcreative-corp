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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DailyTimelineEntry } from "@/lib/daily-report-types"

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
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <ScrollArea className="h-[420px] max-h-[420px] pr-3" scrollbars="vertical">
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
                      <Badge variant="outline">{entry.module}</Badge>
                      {entry.brandName ? (
                        <Badge variant="secondary">{entry.brandName}</Badge>
                      ) : null}
                      {entry.employeeName ? (
                        <Badge variant="secondary">{entry.employeeName}</Badge>
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
