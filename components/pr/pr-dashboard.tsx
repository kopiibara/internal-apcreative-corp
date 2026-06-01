"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  DEFAULT_PR_FILTERS,
  matchesPRFilters,
  PRFilters,
  type PRFiltersState,
} from "@/components/pr/pr-filters";
import { PRMetricCards } from "@/components/pr/pr-metric-cards";
import { PRRequestDetailsSheet } from "@/components/pr/pr-request-details-sheet";
import { PRRequestForm } from "@/components/pr/pr-request-form";
import { PRRequestDataTable } from "@/components/pr/pr-request-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePRRequestMetrics } from "@/lib/pr/pr-types";
import type { PRRequesterOption } from "@/lib/pr/pr-requests";
import type { PRRequestRecord } from "@/lib/pr/pr-types";

export type PRDashboardProps = {
  requests: PRRequestRecord[];
  brands: { id: number; name: string }[];
  requesterOptions: PRRequesterOption[];
  currentProfileId: number;
  canCreate: boolean;
  canManage: boolean;
  readOnlyMode: boolean;
};

export function PRDashboard({
  requests,
  brands,
  requesterOptions,
  currentProfileId,
  canCreate,
  canManage,
  readOnlyMode,
}: PRDashboardProps) {
  const [filters, setFilters] = useState<PRFiltersState>(DEFAULT_PR_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedRequest, setSelectedRequest] = useState<PRRequestRecord | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState<PRRequestRecord | null>(
    null,
  );

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesPRFilters(request, filters)),
    [filters, requests],
  );

  const metrics = useMemo(
    () => calculatePRRequestMetrics(filteredRequests),
    [filteredRequests],
  );

  function openCreateForm() {
    setFormMode("create");
    setSelectedRequest(null);
    setFormOpen(true);
  }

  function openEditForm(request: PRRequestRecord) {
    setFormMode("edit");
    setSelectedRequest(request);
    setFormOpen(true);
  }

  function openDetails(request: PRRequestRecord) {
    setDetailsRequest(request);
    setDetailsOpen(true);
  }

  function handleEditFromSheet(request: PRRequestRecord) {
    setDetailsOpen(false);
    openEditForm(request);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <PRMetricCards metrics={metrics} />

      <Card className="min-h-0 flex-1 gap-0 py-0 shadow-none">
        <CardHeader className="border-b-2 border-border px-4 py-3">
          <CardTitle className="text-base font-bold">PR Request Tracker</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="min-w-0 flex-1">
              <PRFilters
                brands={brands}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
            {canCreate ? (
              <Button
                type="button"
                onClick={openCreateForm}
                className="w-full shrink-0 lg:ml-auto lg:w-auto"
              >
                <Plus className="size-4" />
                Add PR request
              </Button>
            ) : null}
          </div>

          <PRRequestDataTable
            requests={filteredRequests}
            canManage={canManage}
            canCreate={canCreate}
            currentProfileId={currentProfileId}
            readOnlyMode={readOnlyMode}
            onOpenDetails={openDetails}
            onEditRequest={openEditForm}
          />
        </CardContent>
      </Card>

      <PRRequestDetailsSheet
        request={detailsRequest}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        canManage={canManage}
        canCreate={canCreate}
        currentProfileId={currentProfileId}
        onEdit={handleEditFromSheet}
      />

      <PRRequestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        brands={brands}
        requesterOptions={requesterOptions}
        currentProfileId={currentProfileId}
        canCreate={canCreate}
        canManage={canManage}
        mode={formMode}
        request={selectedRequest}
      />
    </div>
  );
}
