"use client";

import { Pencil } from "lucide-react";

import { PRRequestTimeline } from "@/components/pr/pr-request-timeline";
import {
  PRCollaborationStatusBadge,
  PRContactStatusBadge,
} from "@/components/pr/pr-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getPRCollaborationStatusLabel,
  getPRContactStatusLabel,
  getPRInfluencerSizeLabel,
  getPRRequestTypeLabel,
} from "@/lib/pr/pr-labels";
import type { PRRequestRecord } from "@/lib/pr/pr-types";
import { formatPRTimelineDate } from "@/lib/pr/pr-timeline";

type PRRequestDetailsSheetProps = {
  request: PRRequestRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit?: (request: PRRequestRecord) => void;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

function SummaryCard({ request }: { request: PRRequestRecord }) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">Request details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
        <DetailField label="Date added">
          {formatPRTimelineDate(request.createdAt)}
        </DetailField>
        <DetailField label="Branch">{request.brandName}</DetailField>
        <DetailField label="Type">
          {getPRRequestTypeLabel(request.requestType)}
        </DetailField>
        <DetailField label="Influencer size">
          {getPRInfluencerSizeLabel(request.influencerSize)}
        </DetailField>
        <DetailField label="Requested by">{request.requestedByName}</DetailField>
        <DetailField label="Date of visit">
          {request.dateOfVisit ?? "—"}
        </DetailField>
        <DetailField label="Contact status">
          <PRContactStatusBadge status={request.contactStatus} />
        </DetailField>
        <DetailField label="Collaboration status">
          <PRCollaborationStatusBadge status={request.collaborationStatus} />
        </DetailField>
        <DetailField label="Recommendation">
          <p className="break-all">{request.recommendation}</p>
        </DetailField>
        <DetailField label="Initial details">
          <p className="whitespace-pre-wrap">
            {request.initialDetails?.trim() || "—"}
          </p>
        </DetailField>
        <DetailField label="Follow-up / reason">
          <p className="whitespace-pre-wrap">
            {request.followUpNotes?.trim() ||
              request.declinedReason?.trim() ||
              "—"}
          </p>
        </DetailField>
      </CardContent>
    </Card>
  );
}

export function PRRequestDetailsSheet({
  request,
  open,
  onOpenChange,
  canManage,
  onEdit,
}: PRRequestDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden sm:max-w-4xl! sm:w-[50vw]! xl:max-w-6xl!">
        <SheetHeader className="shrink-0 border-b-2 border-border px-4 pb-4">
          {request ? (
            <>
              <SheetTitle className="flex flex-wrap items-center gap-3 font-medium">
                <span className="text-xl font-bold sm:text-2xl">PR Request</span>
                <PRContactStatusBadge status={request.contactStatus} />
                <PRCollaborationStatusBadge status={request.collaborationStatus} />
              </SheetTitle>
              <SheetDescription>
                {request.brandName} · {request.requestedByName}
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle>PR Request</SheetTitle>
              <SheetDescription>Review request details and timeline.</SheetDescription>
            </>
          )}
        </SheetHeader>

        {request ? (
          <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
            <div className="grid min-w-0 grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[2fr_1fr]">
              <div className="min-w-0 space-y-4">
                <SummaryCard request={request} />
                <PRRequestTimeline request={request} />
              </div>
              <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
                <Card className="gap-0 py-0 shadow-none">
                  <CardHeader className="border-b-2 border-border px-4 py-3">
                    <CardTitle className="text-sm font-semibold">Quick summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 text-sm">
                    <p>
                      <span className="font-semibold">Contact:</span>{" "}
                      {getPRContactStatusLabel(request.contactStatus)}
                    </p>
                    <p>
                      <span className="font-semibold">Collaboration:</span>{" "}
                      {getPRCollaborationStatusLabel(request.collaborationStatus)}
                    </p>
                    <p className="break-all">
                      <span className="font-semibold">Link / name:</span>{" "}
                      {request.recommendation}
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </ScrollArea>
        ) : null}

        {request && canManage && onEdit ? (
          <SheetFooter className="sticky bottom-0 z-10 shrink-0 border-t-2 border-border bg-background/95 px-4  backdrop-blur">
            <Button
              type="button"
              variant="default"
              onClick={() => onEdit(request)}
              className="mr-auto"
            >
              <Pencil className="size-4" />
              Edit request
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
