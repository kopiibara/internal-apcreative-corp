import type {
  ApprovalActivityLog,
  ContentReport,
} from "@/types/content-report";

export const APPROVAL_REVISION_AREA_IDS = [
  "caption",
  "content-type",
  "platform",
  "asset-link",
  "creative-layout",
  "brand",
  "other",
] as const;

export type ApprovalRevisionAreaId =
  (typeof APPROVAL_REVISION_AREA_IDS)[number];

export const APPROVAL_REVISION_AREA_LABELS: Record<
  ApprovalRevisionAreaId,
  string
> = {
  caption: "Caption / Description",
  "content-type": "Content Type",
  platform: "Platform",
  "asset-link": "Asset Link",
  "creative-layout": "Creative / Layout",
  brand: "Brand",
  other: "Other",
};

export type ApprovalRevisionRole = "supervisor" | "director";

export type ApprovalRevisionRequest = {
  id: string;
  role: ApprovalRevisionRole;
  roleLabel: string;
  requestedByName: string;
  requestedAt: string;
  areas: ApprovalRevisionAreaId[];
  areaLabels: string[];
  instruction: string;
  otherExplanation: string | null;
  status: "open" | "addressed";
  addressedAt: string | null;
  addressedByName: string | null;
};

export type ApprovalRevisionMetadata = {
  revisionRole: ApprovalRevisionRole;
  revisionAreas: ApprovalRevisionAreaId[];
  revisionInstruction: string;
  otherExplanation?: string | null;
  status: "open" | "addressed";
  requestedAt: string;
  addressedAt?: string | null;
  addressedByProfileId?: number | null;
  addressedByName?: string | null;
};

const REVISION_REQUEST_ACTIONS = new Set([
  "revision_requested",
  "supervisor_review_update",
  "director_review_update",
  "kanban_supervisor_status_update",
  "kanban_director_status_update",
]);

const REVISION_ADDRESS_ACTION = "revision_addressed";

export function getApprovalRevisionAreaLabel(area: ApprovalRevisionAreaId) {
  return APPROVAL_REVISION_AREA_LABELS[area];
}

export function canIncludeBrandRevisionArea(report: {
  supervisorStatus: string;
  directorStatus: string;
}) {
  return (
    report.supervisorStatus === "Pending" && report.directorStatus === "Pending"
  );
}

export function getSelectableRevisionAreas(report: {
  supervisorStatus: string;
  directorStatus: string;
}) {
  return APPROVAL_REVISION_AREA_IDS.filter((area) => {
    if (area === "brand") {
      return canIncludeBrandRevisionArea(report);
    }

    return true;
  });
}

function isRevisionAreaId(value: unknown): value is ApprovalRevisionAreaId {
  return (
    typeof value === "string" &&
    APPROVAL_REVISION_AREA_IDS.includes(value as ApprovalRevisionAreaId)
  );
}

function parseRevisionMetadata(
  metadata: Record<string, unknown> | null,
): ApprovalRevisionMetadata | null {
  if (!metadata) {
    return null;
  }

  const revisionRole = metadata.revisionRole;
  const revisionAreas = metadata.revisionAreas;
  const revisionInstruction = metadata.revisionInstruction;

  if (
    (revisionRole !== "supervisor" && revisionRole !== "director") ||
    !Array.isArray(revisionAreas) ||
    typeof revisionInstruction !== "string" ||
    !revisionInstruction.trim()
  ) {
    return null;
  }

  const areas = revisionAreas.filter(isRevisionAreaId);

  if (areas.length === 0) {
    return null;
  }

  return {
    revisionRole,
    revisionAreas: areas,
    revisionInstruction: revisionInstruction.trim(),
    otherExplanation:
      typeof metadata.otherExplanation === "string"
        ? metadata.otherExplanation.trim() || null
        : null,
    status: metadata.status === "addressed" ? "addressed" : "open",
    requestedAt:
      typeof metadata.requestedAt === "string"
        ? metadata.requestedAt
        : new Date().toISOString(),
    addressedAt:
      typeof metadata.addressedAt === "string" ? metadata.addressedAt : null,
    addressedByProfileId:
      typeof metadata.addressedByProfileId === "number"
        ? metadata.addressedByProfileId
        : null,
    addressedByName:
      typeof metadata.addressedByName === "string"
        ? metadata.addressedByName
        : null,
  };
}

function getRevisionRoleFromLog(
  log: ApprovalActivityLog,
): ApprovalRevisionRole | null {
  const metadataRole = log.metadata?.revisionRole;

  if (metadataRole === "supervisor" || metadataRole === "director") {
    return metadataRole;
  }

  if (log.action.includes("supervisor")) {
    return "supervisor";
  }

  if (log.action.includes("director")) {
    return "director";
  }

  return null;
}

function buildRevisionRequestFromLog(
  log: ApprovalActivityLog,
  metadata: ApprovalRevisionMetadata,
): ApprovalRevisionRequest {
  const areaLabels = metadata.revisionAreas.map(getApprovalRevisionAreaLabel);

  return {
    id: `${log.id}-${metadata.revisionRole}`,
    role: metadata.revisionRole,
    roleLabel:
      metadata.revisionRole === "supervisor" ? "Supervisor" : "Director",
    requestedByName: log.actorName,
    requestedAt: metadata.requestedAt || log.createdAt,
    areas: metadata.revisionAreas,
    areaLabels,
    instruction: metadata.revisionInstruction,
    otherExplanation: metadata.otherExplanation ?? null,
    status: metadata.status,
    addressedAt: metadata.addressedAt ?? null,
    addressedByName: metadata.addressedByName ?? null,
  };
}

export function getOpenRevisionRequestsFromLogs(
  logs: ApprovalActivityLog[],
  report: Pick<ContentReport, "supervisorStatus" | "directorStatus">,
): ApprovalRevisionRequest[] {
  const requestsByRole = new Map<
    ApprovalRevisionRole,
    ApprovalRevisionRequest
  >();

  for (const log of logs) {
    if (log.action === REVISION_ADDRESS_ACTION) {
      const role = getRevisionRoleFromLog(log);
      const metadata = parseRevisionMetadata(log.metadata);

      if (role && metadata?.status === "addressed") {
        requestsByRole.delete(role);
      }
      continue;
    }

    if (
      !REVISION_REQUEST_ACTIONS.has(log.action) ||
      log.toStatus !== "Revision"
    ) {
      continue;
    }

    const metadata = parseRevisionMetadata(log.metadata);

    if (!metadata) {
      continue;
    }

    const role = metadata.revisionRole;
    const existing = requestsByRole.get(role);

    if (
      !existing ||
      new Date(metadata.requestedAt).getTime() >=
        new Date(existing.requestedAt).getTime()
    ) {
      requestsByRole.set(role, buildRevisionRequestFromLog(log, metadata));
    }
  }

  const openRequests: ApprovalRevisionRequest[] = [];

  if (report.supervisorStatus === "Revision") {
    const supervisorRequest = requestsByRole.get("supervisor");

    if (supervisorRequest && supervisorRequest.status === "open") {
      openRequests.push(supervisorRequest);
    }
  }

  if (report.directorStatus === "Revision") {
    const directorRequest = requestsByRole.get("director");

    if (directorRequest && directorRequest.status === "open") {
      openRequests.push(directorRequest);
    }
  }

  return openRequests;
}

export function getRevisionAreaCount(report: ContentReport) {
  const openRequests = getOpenRevisionRequestsFromLogs(
    report.activityLogs,
    report,
  );

  return openRequests.reduce(
    (total, request) => total + request.areas.length,
    0,
  );
}

export function getRevisionSummaryLabel(report: ContentReport) {
  const openRequests = getOpenRevisionRequestsFromLogs(
    report.activityLogs,
    report,
  );
  const labels = openRequests.flatMap((request) => request.areaLabels);

  if (labels.length === 0) {
    return null;
  }

  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

export type ApprovalRevisionFormField =
  | "brandId"
  | "contentType"
  | "platform"
  | "contentInspo"
  | "caption"
  | "assetLink"
  | "employeeComments";

export function revisionAreaMatchesFormField(
  area: ApprovalRevisionAreaId,
  field: ApprovalRevisionFormField,
) {
  return APPROVAL_REVISION_FORM_FIELD_MAP[area]?.includes(field) ?? false;
}

const APPROVAL_REVISION_FORM_FIELD_MAP: Partial<
  Record<ApprovalRevisionAreaId, ApprovalRevisionFormField[]>
> = {
  caption: ["caption"],
  "content-type": ["contentType"],
  platform: ["platform"],
  "asset-link": ["assetLink"],
  "creative-layout": ["contentInspo", "employeeComments"],
  brand: ["brandId"],
  other: ["employeeComments"],
};

export function getHighlightedRevisionFormFields(
  openRequests: ApprovalRevisionRequest[],
) {
  const fields = new Set<ApprovalRevisionFormField>();

  for (const request of openRequests) {
    for (const area of request.areas) {
      for (const field of APPROVAL_REVISION_FORM_FIELD_MAP[area] ?? []) {
        fields.add(field);
      }
    }
  }

  return fields;
}

export function buildRevisionRequestMetadata(input: {
  revisionRole: ApprovalRevisionRole;
  revisionAreas: ApprovalRevisionAreaId[];
  revisionInstruction: string;
  otherExplanation?: string | null;
}): ApprovalRevisionMetadata {
  return {
    revisionRole: input.revisionRole,
    revisionAreas: input.revisionAreas,
    revisionInstruction: input.revisionInstruction.trim(),
    otherExplanation: input.otherExplanation?.trim() || null,
    status: "open",
    requestedAt: new Date().toISOString(),
  };
}

export function buildRevisionAddressedMetadata(input: {
  revisionRole: ApprovalRevisionRole;
  revisionAreas: ApprovalRevisionAreaId[];
  revisionInstruction: string;
  addressedByProfileId: number;
  addressedByName: string;
  changedFields: {
    label: string;
    from: string | null;
    to: string | null;
  }[];
}): Record<string, unknown> {
  return {
    revisionRole: input.revisionRole,
    revisionAreas: input.revisionAreas,
    revisionInstruction: input.revisionInstruction,
    status: "addressed",
    requestedAt: new Date().toISOString(),
    addressedAt: new Date().toISOString(),
    addressedByProfileId: input.addressedByProfileId,
    addressedByName: input.addressedByName,
    changedFields: input.changedFields,
  };
}
