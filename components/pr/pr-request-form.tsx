"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createPRRequest,
  updatePRRequestAction,
} from "@/app/employee/pr/actions";
import { PRStatusButtonGroup } from "@/components/pr/pr-status-button-group";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogBody,
  DialogContent,
  dialogFormClassName,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/ui/required-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getPRCollaborationStatusLabel,
  getPRContactStatusLabel,
  getPRInfluencerSizeLabel,
  getPRRequestTypeLabel,
} from "@/lib/pr/pr-labels";
import type { PRRequestRecord } from "@/lib/pr/pr-types";
import {
  PR_COLLABORATION_STATUSES,
  PR_CONTACT_STATUSES,
  PR_INFLUENCER_SIZES,
  PR_REQUEST_TYPES,
  type PRCollaborationStatus,
  type PRContactStatus,
  type PRInfluencerSize,
  type PRRequestType,
} from "@/lib/pr/pr-constants";
import {
  getPRCollaborationStatusButtonClassName,
  getPRContactStatusButtonClassName,
} from "@/lib/pr/pr-status-styles";
import type { PRRequesterOption } from "@/lib/pr/pr-requests";

type PRRequestFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: { id: number; name: string }[];
  requesterOptions: PRRequesterOption[];
  currentProfileId: number;
  canCreate: boolean;
  canManage: boolean;
  mode: "create" | "edit";
  request?: PRRequestRecord | null;
};

type FormState = {
  brandId: string;
  requestedByProfileId: string;
  requestType: PRRequestType;
  influencerSize: PRInfluencerSize | null;
  recommendation: string;
  initialDetails: string;
  contactStatus: PRContactStatus;
  dateOfVisit: string;
  collaborationStatus: PRCollaborationStatus;
  followUpNotes: string;
  declinedReason: string;
};

function getDefaultFormState(): FormState {
  return {
    brandId: "",
    requestedByProfileId: "",
    requestType: "INFLUENCER",
    influencerSize: "MICRO",
    recommendation: "",
    initialDetails: "",
    contactStatus: "PENDING",
    dateOfVisit: "",
    collaborationStatus: "PENDING",
    followUpNotes: "",
    declinedReason: "",
  };
}

function mapRequestToForm(request: PRRequestRecord): FormState {
  return {
    brandId: String(request.brandId),
    requestedByProfileId: String(request.requestedByProfileId),
    requestType: request.requestType,
    influencerSize: request.influencerSize,
    recommendation: request.recommendation,
    initialDetails: request.initialDetails ?? "",
    contactStatus: request.contactStatus,
    dateOfVisit: request.dateOfVisit ?? "",
    collaborationStatus: request.collaborationStatus,
    followUpNotes: request.followUpNotes ?? "",
    declinedReason: request.declinedReason ?? "",
  };
}

export function PRRequestForm({
  open,
  onOpenChange,
  brands,
  requesterOptions,
  currentProfileId,
  canCreate,
  canManage,
  mode,
  request,
}: PRRequestFormProps) {
  const [formState, setFormState] = useState<FormState>(getDefaultFormState);
  const [isPending, startTransition] = useTransition();
  const isCreateMode = mode === "create";
  const showActionSection = (isCreateMode && canCreate) || canManage;
  const warmControlClassName =
    "border-yellow-950 bg-white text-yellow-950 placeholder:text-yellow-950/45 focus-visible:ring-yellow-950 dark:border-yellow-900 dark:bg-yellow-50 dark:text-yellow-950";
  const orangeControlClassName =
    "border-orange-950 bg-white text-orange-950 placeholder:text-orange-950/45 focus-visible:ring-orange-950 dark:border-orange-900 dark:bg-orange-50 dark:text-orange-950";
  const inactiveWarmButtonClassName =
    "border-yellow-950 bg-yellow-50 text-yellow-950 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-50 dark:text-yellow-950";

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && request) {
      setFormState(mapRequestToForm(request));
      return;
    }

    setFormState({
      ...getDefaultFormState(),
      requestedByProfileId: String(
        requesterOptions.some((option) => option.id === currentProfileId)
          ? currentProfileId
          : requesterOptions[0]?.id ?? "",
      ),
    });
  }, [currentProfileId, open, mode, request, requesterOptions]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      if (mode === "edit" && request) {
        const result = await updatePRRequestAction({
          requestId: request.id,
          brandId: Number(formState.brandId),
          requestedByProfileId: Number(formState.requestedByProfileId),
          requestType: formState.requestType,
          influencerSize:
            formState.requestType === "INFLUENCER"
              ? formState.influencerSize
              : null,
          recommendation: formState.recommendation,
          initialDetails: formState.initialDetails || null,
          contactStatus: formState.contactStatus,
          dateOfVisit: formState.dateOfVisit || null,
          collaborationStatus: formState.collaborationStatus,
          followUpNotes: formState.followUpNotes || null,
          declinedReason: formState.declinedReason || null,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        onOpenChange(false);
        return;
      }

      const result = await createPRRequest({
        brandId: Number(formState.brandId),
        requestedByProfileId: Number(formState.requestedByProfileId),
        requestType: formState.requestType,
        influencerSize:
          formState.requestType === "INFLUENCER"
            ? formState.influencerSize
            : null,
        recommendation: formState.recommendation,
        initialDetails: formState.initialDetails || null,
        contactStatus: showActionSection ? formState.contactStatus : "PENDING",
        dateOfVisit: showActionSection ? formState.dateOfVisit || null : null,
        collaborationStatus: showActionSection
          ? formState.collaborationStatus
          : "PENDING",
        followUpNotes: showActionSection ? formState.followUpNotes || null : null,
        declinedReason: showActionSection
          ? formState.declinedReason || null
          : null,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? "Add PR Request" : "Edit PR Request"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={dialogFormClassName}>
          <DialogBody className="px-4 sm:px-6">
            <div className="flex flex-col gap-6 pb-1">
              <section className="space-y-5 rounded-lg border-2 border-yellow-950 bg-yellow-100 p-4 text-yellow-950 dark:border-yellow-800 dark:bg-yellow-200 sm:p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Yellow Section — Requestor / Company Action
                </h3>

                <div className="space-y-2">
                  <RequiredLabel htmlFor="pr-brand">Branch / Brand</RequiredLabel>
                  <Select
                    value={formState.brandId}
                    onValueChange={(value) => updateForm("brandId", value)}
                    disabled={isPending}
                  >
                    <SelectTrigger id="pr-brand" className={warmControlClassName}>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={String(brand.id)}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PRStatusButtonGroup
                    className="min-w-0"
                    label="Request type"
                    value={formState.requestType}
                    options={PR_REQUEST_TYPES.map((type) => ({
                      value: type,
                      label: getPRRequestTypeLabel(type),
                    }))}
                    onChange={(value) => {
                      updateForm("requestType", value);
                      if (value === "BRAND_PARTNERSHIP") {
                        updateForm("influencerSize", null);
                      } else if (!formState.influencerSize) {
                        updateForm("influencerSize", "MICRO");
                      }
                    }}
                    disabled={isPending}
                    getOptionClassName={(_, isActive) =>
                      isActive ? "" : inactiveWarmButtonClassName
                    }
                  />

                  {formState.requestType === "INFLUENCER" ? (
                    <PRStatusButtonGroup
                      className="min-w-0"
                      label="Influencer size"
                      value={formState.influencerSize ?? "MICRO"}
                      options={PR_INFLUENCER_SIZES.map((size) => ({
                        value: size,
                        label: getPRInfluencerSizeLabel(size),
                      }))}
                      onChange={(value) => updateForm("influencerSize", value)}
                      disabled={isPending}
                      getOptionClassName={(_, isActive) =>
                        isActive ? "" : inactiveWarmButtonClassName
                      }
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <RequiredLabel htmlFor="pr-requested-by">
                    Requested by
                  </RequiredLabel>
                  <Select
                    value={formState.requestedByProfileId}
                    onValueChange={(value) =>
                      updateForm("requestedByProfileId", value)
                    }
                    disabled={isPending || requesterOptions.length === 0}
                  >
                    <SelectTrigger
                      id="pr-requested-by"
                      className={warmControlClassName}
                    >
                      <SelectValue placeholder="Select requester" />
                    </SelectTrigger>
                    <SelectContent>
                      {requesterOptions.map((requester) => (
                        <SelectItem
                          key={requester.id}
                          value={String(requester.id)}
                        >
                          {requester.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <RequiredLabel htmlFor="pr-recommendation">
                    Influencer link / Partnership name or link
                  </RequiredLabel>
                  <Input
                    id="pr-recommendation"
                    value={formState.recommendation}
                    onChange={(event) =>
                      updateForm("recommendation", event.target.value)
                    }
                    disabled={isPending}
                    className={warmControlClassName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pr-initial-details">Initial details</Label>
                  <Textarea
                    id="pr-initial-details"
                    value={formState.initialDetails}
                    onChange={(event) =>
                      updateForm("initialDetails", event.target.value)
                    }
                    disabled={isPending}
                    placeholder="Add campaign idea, audience fit, offer idea, or request context."
                    className={warmControlClassName}
                  />
                </div>
              </section>

              {showActionSection ? (
                <section className="space-y-5 rounded-lg border-2 border-orange-950 bg-orange-100 p-4 text-orange-950 dark:border-orange-800 dark:bg-orange-200 sm:p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide">
                    Orange Section — PR / Follow-up Action
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <PRStatusButtonGroup
                      className="min-w-0"
                      label="Contact status"
                      value={formState.contactStatus}
                      options={PR_CONTACT_STATUSES.map((status) => ({
                        value: status,
                        label: getPRContactStatusLabel(status),
                      }))}
                      getOptionClassName={(status, isActive) =>
                        getPRContactStatusButtonClassName(status, isActive)
                      }
                      onChange={(value) => updateForm("contactStatus", value)}
                      disabled={isPending}
                    />

                    {formState.contactStatus === "CONTACTED" ? (
                      <PRStatusButtonGroup
                        className="min-w-0"
                        label="Collaboration status"
                        value={formState.collaborationStatus}
                        options={PR_COLLABORATION_STATUSES.map((status) => ({
                          value: status,
                          label: getPRCollaborationStatusLabel(status),
                        }))}
                        getOptionClassName={(status, isActive) =>
                          getPRCollaborationStatusButtonClassName(
                            status,
                            isActive,
                          )
                        }
                        onChange={(value) =>
                          updateForm("collaborationStatus", value)
                        }
                        disabled={isPending}
                      />
                    ) : null}
                  </div>

                  {formState.contactStatus === "CONTACTED" ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Label className="shrink-0">Date of visit</Label>
                      <DatePicker
                        value={formState.dateOfVisit}
                        onChange={(value) => updateForm("dateOfVisit", value)}
                        disabled={isPending}
                        className={`min-w-0 flex-1 sm:max-w-xs ${orangeControlClassName}`}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="pr-follow-up">
                      Follow-up notes / reason / next step
                      {formState.contactStatus === "DECLINED" ? " *" : ""}
                    </Label>
                    <Textarea
                      id="pr-follow-up"
                      value={
                        formState.contactStatus === "DECLINED"
                          ? formState.followUpNotes || formState.declinedReason
                          : formState.followUpNotes
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        updateForm("followUpNotes", value);
                        if (formState.contactStatus === "DECLINED") {
                          updateForm("declinedReason", value);
                        }
                      }}
                      disabled={isPending}
                      className={orangeControlClassName}
                    />
                  </div>
                </section>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isCreateMode ? "Create request" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
