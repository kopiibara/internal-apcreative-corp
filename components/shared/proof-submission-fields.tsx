"use client"

import { TaskProofFileField } from "@/components/to-do/task-proof-file-field"
import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PROOF_SUBMIT_TYPES, type ProofSubmitType } from "@/lib/proof/proof-types"

type ProofSubmissionFieldsProps = {
  proofType: ProofSubmitType
  proofUrl: string
  proofNote: string
  disabled?: boolean
  onProofTypeChange: (proofType: ProofSubmitType) => void
  onProofUrlChange: (proofUrl: string) => void
  onProofNoteChange: (proofNote: string) => void
  idPrefix?: string
  showPreview?: boolean
  linkLabel?: string
  noteLabel?: string
  noteMaxLength?: number
}

export function ProofSubmissionFields({
  proofType,
  proofUrl,
  proofNote,
  disabled = false,
  onProofTypeChange,
  onProofUrlChange,
  onProofNoteChange,
  idPrefix = "proof",
  showPreview = true,
  linkLabel = "Proof URL",
  noteLabel = "Proof note",
}: ProofSubmissionFieldsProps) {
  function handleProofTypeChange(nextType: ProofSubmitType) {
    onProofTypeChange(nextType)
    onProofUrlChange("")
    onProofNoteChange("")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Proof type</Label>
        <Select
          value={proofType}
          onValueChange={(value) =>
            handleProofTypeChange(value as ProofSubmitType)
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROOF_SUBMIT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {proofType === "LINK" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-url`}>{linkLabel}</Label>
          <Input
            id={`${idPrefix}-url`}
            value={proofUrl}
            onChange={(event) => onProofUrlChange(event.target.value)}
            placeholder="https://..."
            disabled={disabled}
          />
        </div>
      ) : null}

      {proofType === "IMAGE" ? (
        <>
          <TaskProofFileField
            value={proofUrl}
            disabled={disabled}
            onChange={onProofUrlChange}
            onClear={() => onProofUrlChange("")}
          />
          {showPreview && proofUrl ? (
            <TaskProofDisplay
              proofType={proofType}
              proofUrl={proofUrl}
              mediaClassName="max-h-40"
            />
          ) : null}
        </>
      ) : null}

      {proofType === "NOTE" ? (
        <RichTextEditor
          id={`${idPrefix}-note`}
          value={proofNote}
          onChange={onProofNoteChange}
          label={noteLabel}
          placeholder="Add proof notes..."
          disabled={disabled}
          minHeight={120}
          maxHeight={240}
        />
      ) : null}
    </div>
  )
}
