"use client";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  buildPRRequestTimeline,
  formatPRTimelineDate,
} from "@/lib/pr/pr-timeline";
import type { PRRequestRecord } from "@/lib/pr/pr-types";

type PRRequestTimelineProps = {
  request: PRRequestRecord;
};

export function PRRequestTimeline({ request }: PRRequestTimelineProps) {
  const events = buildPRRequestTimeline(request);

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          <ScrollArea
            className="h-[min(360px,45vh)] pr-3"
            scrollbars="vertical"
            viewportClassName="h-full"
          >
            <Timeline defaultValue={events.length} className="w-full min-w-0">
              {events.map((event, index) => (
                <TimelineItem key={event.id} step={index + 1}>
                  <TimelineHeader>
                    <TimelineDate>{formatPRTimelineDate(event.occurredAt)}</TimelineDate>
                    <TimelineTitle>{event.title}</TimelineTitle>
                  </TimelineHeader>
                  <TimelineIndicator />
                  <TimelineSeparator />
                  <TimelineContent className="min-w-0 space-y-1">
                    {event.description ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
