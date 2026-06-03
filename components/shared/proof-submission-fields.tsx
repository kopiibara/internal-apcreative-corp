"use client"

import { useState } from "react"
import { Eye, Plus, Trash2 } from "lucide-react"

import { TaskProofFileField } from "@/components/to-do/task-proof-file-field"
import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import { TaskProofViewDialog } from "@/components/shared/task-proof-view-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MAX_PROOF_IMAGES,
  MAX_PROOF_LINKS,
  formatProofUrlListForStorage,
  getProofImageList,
  getProofLinkList,
} from "@/lib/proof/proof-media"
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
  allowMultipleLinks?: boolean
  allowMultipleImages?: boolean
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
  allowMultipleLinks = false,
  allowMultipleImages = false,
}: ProofSubmissionFieldsProps) {
  const [viewImageProof, setViewImageProof] = useState<string | null>(null)
  const proofLinks = getProofLinkList(proofUrl)
  const proofImages = getProofImageList(proofUrl)
  const rawLinkInputs = proofUrl.split(/\r?\n/)
  const rawImageInputs = proofUrl.split(/\r?\n/)
  const linkInputs = allowMultipleLinks
    ? rawLinkInputs.length > 0
      ? rawLinkInputs
      : [""]
    : proofLinks.length > 0
      ? proofLinks
      : [""]
  const imageInputs = allowMultipleImages
    ? rawImageInputs.length > 0
      ? rawImageInputs
      : [""]
    : proofImages.length > 0
      ? proofImages
      : [""]

  function handleProofTypeChange(nextType: ProofSubmitType) {
    onProofTypeChange(nextType)
    onProofUrlChange("")
    onProofNoteChange("")
  }

  function updateProofLink(index: number, value: string) {
    const nextLinks = [...linkInputs]
    nextLinks[index] = value
    onProofUrlChange(nextLinks.join("\n"))
  }

  function addProofLink() {
    onProofUrlChange([...linkInputs, ""].join("\n"))
  }

  function removeProofLink(index: number) {
    const nextLinks = linkInputs.filter((_, linkIndex) => linkIndex !== index)
    onProofUrlChange(nextLinks.join("\n"))
  }

  function updateProofImage(index: number, value: string) {
    const nextImages = [...imageInputs]
    nextImages[index] = value
    onProofUrlChange(nextImages.join("\n"))
  }

  function addProofImage() {
    onProofUrlChange([...imageInputs, ""].join("\n"))
  }

  function removeProofImage(index: number) {
    const nextImages = imageInputs.filter((_, imageIndex) => imageIndex !== index)
    onProofUrlChange(formatProofUrlListForStorage(nextImages))
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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${idPrefix}-url`}>{linkLabel}</Label>
            {allowMultipleLinks ? (
              <Button
                type="button"
                size="icon"
                variant="neutral"
                className="size-8"
                title="Add proof link"
                aria-label="Add proof link"
                onClick={addProofLink}
                disabled={disabled || linkInputs.length >= MAX_PROOF_LINKS}
              >
                <Plus className="size-4" />
              </Button>
            ) : null}
          </div>

          {allowMultipleLinks ? (
            <ScrollArea
              className="max-h-56 pr-3"
              viewportClassName="max-h-56"
              scrollbars="vertical"
            >
              <div className="space-y-2 p-1">
                {linkInputs.map((link, index) => (
                  <div key={index} className="flex min-w-0 gap-2">
                    <Input
                      id={index === 0 ? `${idPrefix}-url` : undefined}
                      value={link}
                      onChange={(event) =>
                        updateProofLink(index, event.target.value)
                      }
                      placeholder="https://..."
                      disabled={disabled}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="neutral"
                      className="size-10 shrink-0"
                      title="Remove proof link"
                      aria-label="Remove proof link"
                      onClick={() => removeProofLink(index)}
                      disabled={disabled || linkInputs.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Input
              id={`${idPrefix}-url`}
              value={proofUrl}
              onChange={(event) => onProofUrlChange(event.target.value)}
              placeholder="https://..."
              disabled={disabled}
            />
          )}
        </div>
      ) : null}

      {proofType === "IMAGE" ? (
        <>
          {allowMultipleImages ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${idPrefix}-image-0`}>Image proof</Label>
                <Button
                  type="button"
                  size="icon"
                  variant="neutral"
                  className="size-8"
                  title="Add image proof"
                  aria-label="Add image proof"
                  onClick={addProofImage}
                  disabled={disabled || imageInputs.length >= MAX_PROOF_IMAGES}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <ScrollArea
                className="max-h-72 pr-3"
                viewportClassName="max-h-72"
                scrollbars="vertical"
              >
                <div className="space-y-2 p-1">
                  {imageInputs.map((image, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <TaskProofFileField
                          id={`${idPrefix}-image-${index}`}
                          label={null}
                          value={image}
                          disabled={disabled}
                          showHelpText={index === imageInputs.length - 1}
                          showSelectedState={false}
                          keepSelectedFileName
                          fileNameOnlyDisplay
                          onChange={(dataUrl) => updateProofImage(index, dataUrl)}
                          onClear={() => updateProofImage(index, "")}
                        />
                      </div>
                      {image ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="neutral"
                          className="size-10 shrink-0"
                          title="View image proof"
                          aria-label={`View image proof ${index + 1}`}
                          onClick={() => setViewImageProof(image)}
                          disabled={disabled}
                        >
                          <Eye className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="neutral"
                        className="size-10 shrink-0"
                        title="Remove image proof"
                        aria-label="Remove image proof"
                        onClick={() => removeProofImage(index)}
                        disabled={disabled || imageInputs.length === 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <TaskProofFileField
              value={proofUrl}
              disabled={disabled}
              onChange={onProofUrlChange}
              onClear={() => onProofUrlChange("")}
            />
          )}
          {showPreview && proofUrl && !allowMultipleImages ? (
            <TaskProofDisplay
              proofType={proofType}
              proofUrl={proofUrl}
              mediaClassName="max-h-40"
            />
          ) : null}
          <TaskProofViewDialog
            open={Boolean(viewImageProof)}
            onOpenChange={(open) => {
              if (!open) {
                setViewImageProof(null)
              }
            }}
            proofType="IMAGE"
            proofUrl={viewImageProof}
          />
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
