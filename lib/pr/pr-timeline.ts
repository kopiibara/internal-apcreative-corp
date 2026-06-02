import {
  getPRCollaborationStatusLabel,
  getPRContactStatusLabel,
  getPRInfluencerSizeLabel,
  getPRRequestStatusLabel,
  getPRRequestTypeLabel,
} from "@/lib/pr/pr-labels";
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp";
import { isPRRequestActive, type PRRequestRecord } from "@/lib/pr/pr-types";

export type PRTimelineEvent = {
  id: string;
  title: string;
  description: string | null;
  occurredAt: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatPRTimelineDate(value: string) {
  return formatRecentOrDateTime(value, dateTimeFormatter);
}

export function buildPRRequestTimeline(
  request: PRRequestRecord,
): PRTimelineEvent[] {
  const events: PRTimelineEvent[] = [
    {
      id: "created",
      title: "Request submitted",
      description: `${getPRRequestTypeLabel(request.requestType)} · ${request.brandName}${
        request.influencerSize
          ? ` · ${getPRInfluencerSizeLabel(request.influencerSize)}`
          : ""
      } · ${request.requestedByName}`,
      occurredAt: request.createdAt,
    },
  ];

  if (request.initialDetails?.trim()) {
    events.push({
      id: "initial-details",
      title: "Initial details added",
      description: request.initialDetails.trim(),
      occurredAt: request.createdAt,
    });
  }

  if (request.contactStatus !== "PENDING") {
    events.push({
      id: "contact-status",
      title: `Marked ${getPRContactStatusLabel(request.contactStatus)}`,
      description: request.recommendation,
      occurredAt: request.updatedAt,
    });
  }

  if (request.dateOfVisit) {
    events.push({
      id: "visit",
      title: "Visit date scheduled",
      description: request.dateOfVisit,
      occurredAt: request.updatedAt,
    });
  }

  if (request.collaborationStatus !== "PENDING") {
    events.push({
      id: "collaboration",
      title: `Collaboration ${getPRCollaborationStatusLabel(request.collaborationStatus)}`,
      description: null,
      occurredAt: request.updatedAt,
    });
  }

  if (request.followUpNotes?.trim() || request.declinedReason?.trim()) {
    events.push({
      id: "follow-up",
      title:
        request.contactStatus === "DECLINED"
          ? "Decline reason recorded"
          : "Follow-up note added",
      description:
        request.followUpNotes?.trim() ||
        request.declinedReason?.trim() ||
        null,
      occurredAt: request.updatedAt,
    });
  }

  if (!isPRRequestActive(request)) {
    events.push({
      id: "deleted",
      title: `Marked ${getPRRequestStatusLabel(request.status)}`,
      description: "This request was soft deleted by its creator.",
      occurredAt: request.updatedAt,
    });
  }

  if (
    isPRRequestActive(request) &&
    request.updatedAt !== request.createdAt
  ) {
    events.push({
      id: "updated",
      title: "Request updated",
      description: null,
      occurredAt: request.updatedAt,
    });
  }

  const uniqueById = new Map<string, PRTimelineEvent>();

  for (const event of events) {
    uniqueById.set(event.id, event);
  }

  return [...uniqueById.values()].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime(),
  );
}
