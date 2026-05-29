"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createContentReport,
  updateContentReport,
} from "@/app/employee/approvals/actions"
import { platformOptions } from "@/app/employee/approvals/schema"
import { ContentTypeSelect } from "@/components/employee/approvals/approval-type-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  dialogFormClassName,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RequiredLabel } from "@/components/ui/required-label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  mergeContentReportBrandOptions,
  type ContentReportBrandOption,
} from "@/lib/content-report-brand-options"
import {
  getHighlightedRevisionFormFields,
  getOpenRevisionRequestsFromLogs,
  type ApprovalRevisionFormField,
} from "@/lib/approvals/approval-revision"
import { cn } from "@/lib/utils"
import type { ContentReport } from "@/types/content-report"

type ContentReportFormDialogProps = {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  brandOptions: ContentReportBrandOption[]
  report?: ContentReport | null
}

type FormState = {
  brandId: string
  contentType: string
  platform: string
  contentInspo: string
  caption: string
  assetLink: string
  employeeComments: string
}

function getDefaultBrandId(
  formBrandOptions: ContentReportBrandOption[],
  report?: ContentReport | null,
) {
  if (report?.brandId) {
    return String(report.brandId)
  }

  const primaryBrand = formBrandOptions.find((brand) => brand.isPrimary)

  return String(primaryBrand?.id ?? formBrandOptions[0]?.id ?? "")
}

function getInitialFormState(
  formBrandOptions: ContentReportBrandOption[],
  report?: ContentReport | null,
): FormState {
  return {
    brandId: getDefaultBrandId(formBrandOptions, report),
    contentType: report?.contentType ?? "",
    platform: report?.platform ?? "Meta (IG and FB)",
    contentInspo: report?.contentInspo ?? "",
    caption: report?.caption ?? "",
    assetLink: report?.assetLink ?? "",
    employeeComments: report?.employeeComments ?? "",
  }
}

export function ContentReportFormDialog({
  mode,
  open,
  onOpenChange,
  brandOptions,
  report,
}: ContentReportFormDialogProps) {
  const router = useRouter()
  const isCreateMode = mode === "create"

  const formBrandOptions = useMemo(
    () => mergeContentReportBrandOptions(brandOptions, report),
    [brandOptions, report],
  )

  const [formState, setFormState] = useState<FormState>(() =>
    getInitialFormState(formBrandOptions, report),
  )

  const [isPending, startTransition] = useTransition()

  const canEditBrand =
    isCreateMode ||
    !report ||
    (report.supervisorStatus === "Pending" &&
      report.directorStatus === "Pending")

  const showBrandSelect =
    (isCreateMode && formBrandOptions.length > 0) ||
    (formBrandOptions.length > 1 && canEditBrand)

  const showBrandReadOnly =
    (!showBrandSelect && formBrandOptions.length === 1 && !isCreateMode) ||
    (!canEditBrand && Boolean(report?.brandName))

  const openRevisionRequests =
    !isCreateMode && report
      ? getOpenRevisionRequestsFromLogs(report.activityLogs, report)
      : []

  const highlightedFields = getHighlightedRevisionFormFields(openRevisionRequests)

  function revisionFieldClass(field: ApprovalRevisionFormField) {
    return highlightedFields.has(field)
      ? "rounded-lg border-2 border-amber-600 bg-amber-50/60 p-2"
      : undefined
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormState(getInitialFormState(formBrandOptions, report))
    }

    onOpenChange(nextOpen)
  }

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (showBrandSelect && !formState.brandId) {
      toast.error("Select a brand for this approval request.")
      return
    }

    const brandId = formState.brandId
      ? Number(formState.brandId)
      : formBrandOptions[0]?.id

    startTransition(async () => {
      const payload = {
        brandId,
        contentType: formState.contentType,
        platform: formState.platform,
        contentInspo: formState.contentInspo,
        caption: formState.caption,
        assetLink: formState.assetLink,
        employeeComments: formState.employeeComments,
      }

      const result = isCreateMode
        ? await createContentReport(payload)
        : await updateContentReport({
          reportId: report?.id,
          ...payload,
        })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? "Create Approval Report" : "Edit Approval Report"}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Submit the creative details for approval. Review and publishing fields are managed by admins."
              : "Update this report while it is still editable. You can change the brand if you are assigned to multiple brands."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={dialogFormClassName}
        >
          <DialogBody className="space-y-4">
            {openRevisionRequests.length > 0 ? (
              <div className="space-y-3 rounded-lg border-2 border-amber-600 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Revision instructions</p>

                {openRevisionRequests.map((request) => (
                  <div key={request.id} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {request.roleLabel} feedback
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {request.instruction}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {showBrandSelect ? (
              <div className={cn("space-y-2", revisionFieldClass("brandId"))}>
                <RequiredLabel required>Brand</RequiredLabel>
                <Select
                  value={formState.brandId || undefined}
                  onValueChange={(value) => updateField("brandId", value)}
                  disabled={isPending}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {formBrandOptions.map((brand) => (
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {brand.name}
                        {brand.isPrimary ? " (Primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : showBrandReadOnly ? (
              <div className={cn("space-y-2", revisionFieldClass("brandId"))}>
                <RequiredLabel>Brand</RequiredLabel>
                <Input
                  value={report?.brandName ?? formBrandOptions[0]?.name ?? ""}
                  disabled
                  readOnly
                />

                {!canEditBrand ? (
                  <p className="text-xs text-muted-foreground">
                    Brand is locked after Supervisor or Director review starts.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className={cn("space-y-2", revisionFieldClass("contentType"))}>
              <RequiredLabel required>Content Type</RequiredLabel>
              <ContentTypeSelect
                value={formState.contentType}
                onValueChange={(value) => updateField("contentType", value)}
                disabled={isPending}
              />
            </div>

            <div className={cn("space-y-2", revisionFieldClass("platform"))}>
              <RequiredLabel required>Platform</RequiredLabel>
              <Select
                value={formState.platform || undefined}
                onValueChange={(value) => updateField("platform", value)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={revisionFieldClass("contentInspo")}>
              <RichTextEditor
                id={`${mode}-content-inspo`}
                label="Content Inspo"
                value={formState.contentInspo}
                onChange={(value) => updateField("contentInspo", value)}
                disabled={isPending}
                minHeight={130}
                placeholder="Add references, direction, or inspiration notes."
              />
            </div>

            <div className={cn("space-y-2", revisionFieldClass("caption"))}>
              <RequiredLabel htmlFor={`${mode}-caption`} required>
                Caption
              </RequiredLabel>
              <Textarea
                id={`${mode}-caption`}
                value={formState.caption}
                onChange={(event) =>
                  updateField("caption", event.target.value)
                }
                disabled={isPending}
                required
              />
            </div>

            <div className={cn("space-y-2", revisionFieldClass("assetLink"))}>
              <RequiredLabel htmlFor={`${mode}-asset-link`} required>
                Asset Link
              </RequiredLabel>
              <Input
                id={`${mode}-asset-link`}
                value={formState.assetLink}
                onChange={(event) =>
                  updateField("assetLink", event.target.value)
                }
                disabled={isPending}
                placeholder="https://..."
              />
            </div>

            <div className={revisionFieldClass("employeeComments")}>
              <RichTextEditor
                id={`${mode}-employee-comments`}
                label="Employee Notes / Comments"
                value={formState.employeeComments}
                onChange={(value) => updateField("employeeComments", value)}
                disabled={isPending}
                minHeight={130}
                placeholder="Add context or notes for reviewers."
              />
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
              {isPending ? "Saving..." : "Save Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}