"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RequiredLabel } from "@/components/ui/required-label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Textarea } from "@/components/ui/textarea"
import {
  APPROVAL_REVISION_AREA_LABELS,
  getSelectableRevisionAreas,
  type ApprovalRevisionAreaId,
} from "@/lib/approvals/approval-revision"
import { cn } from "@/lib/utils"
import type { ContentReport } from "@/types/content-report"

type ApprovalRevisionRequestFieldsProps = {
  report: ContentReport
  revisionAreas: ApprovalRevisionAreaId[]
  revisionInstruction: string
  otherExplanation: string
  onRevisionAreasChange: (areas: ApprovalRevisionAreaId[]) => void
  onRevisionInstructionChange: (value: string) => void
  onOtherExplanationChange: (value: string) => void
  disabled?: boolean
}

export function ApprovalRevisionRequestFields({
  report,
  revisionAreas,
  revisionInstruction,
  otherExplanation,
  onRevisionAreasChange,
  onRevisionInstructionChange,
  onOtherExplanationChange,
  disabled = false,
}: ApprovalRevisionRequestFieldsProps) {
  const selectableAreas = getSelectableRevisionAreas(report)
  const showOtherExplanation = revisionAreas.includes("other")

  function toggleArea(area: ApprovalRevisionAreaId, checked: boolean) {
    if (checked) {
      onRevisionAreasChange([...revisionAreas, area])
      return
    }

    onRevisionAreasChange(revisionAreas.filter((value) => value !== area))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <RequiredLabel required>Revision areas</RequiredLabel>
        <p className="text-xs text-muted-foreground">
          Select every part of this request that needs to be updated.
        </p>
        <div className="grid gap-2 rounded-lg border-2 border-border bg-muted/20 p-3 sm:grid-cols-2">
          {selectableAreas.map((area) => {
            const fieldId = `revision-area-${report.id}-${area}`

            return (
              <div key={area} className="flex items-start gap-2">
                <Checkbox
                  id={fieldId}
                  checked={revisionAreas.includes(area)}
                  onCheckedChange={(checked) =>
                    toggleArea(area, checked === true)
                  }
                  disabled={disabled}
                />
                <Label
                  htmlFor={fieldId}
                  className={cn(
                    "text-sm leading-snug font-normal",
                    disabled && "opacity-60",
                  )}
                >
                  {APPROVAL_REVISION_AREA_LABELS[area]}
                </Label>
              </div>
            )
          })}
        </div>
      </div>

      {showOtherExplanation ? (
        <div className="space-y-2">
          <RequiredLabel htmlFor={`revision-other-${report.id}`} required>
            Other details
          </RequiredLabel>
          <Textarea
            id={`revision-other-${report.id}`}
            value={otherExplanation}
            onChange={(event) => onOtherExplanationChange(event.target.value)}
            disabled={disabled}
            className="min-h-20"
            placeholder="Briefly explain what else needs revision."
            required
          />
        </div>
      ) : null}

      <RichTextEditor
        id={`revision-instruction-${report.id}`}
        label="Revision instruction"
        required
        value={revisionInstruction}
        onChange={onRevisionInstructionChange}
        disabled={disabled}
        minHeight={140}
        placeholder="Explain what the creator should change."
      />
    </div>
  )
}
