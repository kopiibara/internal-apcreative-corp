"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PR_COLLABORATION_STATUSES,
  PR_CONTACT_STATUSES,
  PR_INFLUENCER_SIZES,
  PR_REQUEST_TYPES,
} from "@/lib/pr/pr-constants";
import {
  getPRCollaborationStatusLabel,
  getPRContactStatusLabel,
  getPRInfluencerSizeLabel,
  getPRRequestTypeLabel,
} from "@/lib/pr/pr-labels";

export type PRFiltersState = {
  search: string;
  brandId: string;
  requestType: string;
  influencerSize: string;
  contactStatus: string;
  collaborationStatus: string;
};

type PRFiltersProps = {
  brands: { id: number; name: string }[];
  filters: PRFiltersState;
  onFiltersChange: (filters: PRFiltersState) => void;
};

const ALL_VALUE = "all";

export const DEFAULT_PR_FILTERS: PRFiltersState = {
  search: "",
  brandId: ALL_VALUE,
  requestType: ALL_VALUE,
  influencerSize: ALL_VALUE,
  contactStatus: ALL_VALUE,
  collaborationStatus: ALL_VALUE,
};

export function hasActivePRFilters(filters: PRFiltersState) {
  return (
    filters.search.trim().length > 0 ||
    filters.brandId !== ALL_VALUE ||
    filters.requestType !== ALL_VALUE ||
    filters.influencerSize !== ALL_VALUE ||
    filters.contactStatus !== ALL_VALUE ||
    filters.collaborationStatus !== ALL_VALUE
  );
}

export function PRFilters({ brands, filters, onFiltersChange }: PRFiltersProps) {
  function update<K extends keyof PRFiltersState>(key: K, value: PRFiltersState[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = hasActivePRFilters(filters);

  function handleReset() {
    onFiltersChange({ ...DEFAULT_PR_FILTERS });
  }

  return (
    <ScrollArea className="w-full pb-1" scrollbars="horizontal">
      <div className="flex min-w-max flex-wrap items-end gap-3 p-1">
        <div className="min-w-[20vw] space-y-1">
          <Input
            id="pr-search"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Branch, link, name, requester…"
          />
        </div>

        <div className="w-fit space-y-1">
          <Select
            value={filters.brandId}
            onValueChange={(value) => update("brandId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All branches</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={String(brand.id)}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-fit space-y-1">
          <Select
            value={filters.requestType}
            onValueChange={(value) => update("requestType", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All types</SelectItem>
              {PR_REQUEST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {getPRRequestTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-fit space-y-1">
          <Select
            value={filters.influencerSize}
            onValueChange={(value) => update("influencerSize", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All sizes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All sizes</SelectItem>
              {PR_INFLUENCER_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {getPRInfluencerSizeLabel(size)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-fit space-y-1">
          <Select
            value={filters.contactStatus}
            onValueChange={(value) => update("contactStatus", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
              {PR_CONTACT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {getPRContactStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-fit space-y-1">
          <Select
            value={filters.collaborationStatus}
            onValueChange={(value) => update("collaborationStatus", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All collab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All collab</SelectItem>
              {PR_COLLABORATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {getPRCollaborationStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="neutral"
            size="sm"
            className="h-9 shrink-0 whitespace-nowrap"
            onClick={handleReset}
          >
            Reset filters
          </Button>
        ) : null}
      </div>
    </ScrollArea>
  );
}

export function matchesPRFilters(
  request: {
    brandId: number;
    brandName: string;
    requestType: string;
    influencerSize: string | null;
    recommendation: string;
    requestedByName: string;
    contactStatus: string;
    collaborationStatus: string;
  },
  filters: PRFiltersState,
) {
  const query = filters.search.trim().toLowerCase();

  if (query) {
    const haystack = [
      request.brandName,
      request.recommendation,
      request.requestedByName,
      request.requestType,
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (filters.brandId !== ALL_VALUE && String(request.brandId) !== filters.brandId) {
    return false;
  }

  if (
    filters.requestType !== ALL_VALUE &&
    request.requestType !== filters.requestType
  ) {
    return false;
  }

  if (
    filters.influencerSize !== ALL_VALUE &&
    request.influencerSize !== filters.influencerSize
  ) {
    return false;
  }

  if (
    filters.contactStatus !== ALL_VALUE &&
    request.contactStatus !== filters.contactStatus
  ) {
    return false;
  }

  if (
    filters.collaborationStatus !== ALL_VALUE &&
    request.collaborationStatus !== filters.collaborationStatus
  ) {
    return false;
  }

  return true;
}
