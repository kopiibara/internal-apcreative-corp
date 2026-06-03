"use client"

import { useState } from "react"
import { Eye, ExternalLink } from "lucide-react"

import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import { TaskProofViewDialog } from "@/components/shared/task-proof-view-dialog"
import { Button } from "@/components/ui/button"
import {
  getProofImageList,
  getProofLinkList,
  inferProofSubmitType,
  isHttpProofUrl,
  shouldOpenProofInDialog,
} from "@/lib/proof/proof-media"
import type { ProofSubmitType } from "@/lib/proof/proof-types"
import { cn } from "@/lib/utils"

type ProofDisplayProps = {
  proofUrl: string | null
  proofNote?: string | null
  proofType?: ProofSubmitType | null
  className?: string
  mediaClassName?: string
  showViewButton?: boolean
  compact?: boolean
}

export function ProofDisplay({
  proofUrl,
  proofNote,
  proofType: proofTypeProp,
  className,
  mediaClassName,
  showViewButton = true,
  compact = false,
}: ProofDisplayProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null)
  const proofType =
    proofTypeProp ?? inferProofSubmitType(proofUrl, proofNote)
  const hasProof = Boolean(proofUrl?.trim() || proofNote?.trim())
  const proofLinks = proofType === "LINK" ? getProofLinkList(proofUrl) : []
  const proofImages = proofType === "IMAGE" ? getProofImageList(proofUrl) : []

  if (!hasProof) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        Not submitted
      </span>
    )
  }

  const openInDialog =
    showViewButton &&
    proofUrl &&
    shouldOpenProofInDialog(proofType, proofUrl)

  if (compact && proofType === "IMAGE" && proofImages.length > 0) {
    return (
      <>
        <div className={cn("space-y-2", className)}>
          {proofImages.map((image, index) => (
            <div
              key={`${image.slice(0, 48)}-${index}`}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border-2 border-border bg-background px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium">
                Image proof {index + 1}
              </span>
              <Button
                type="button"
                size="icon"
                variant="neutral"
                className="size-8 shrink-0"
                title={`View image proof ${index + 1}`}
                aria-label={`View image proof ${index + 1}`}
                onClick={() => {
                  setViewProofUrl(image)
                  setViewOpen(true)
                }}
              >
                <Eye className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <TaskProofViewDialog
          open={viewOpen}
          onOpenChange={(open) => {
            setViewOpen(open)
            if (!open) {
              setViewProofUrl(null)
            }
          }}
          proofType="IMAGE"
          proofUrl={viewProofUrl}
          proofNote={proofNote}
        />
      </>
    )
  }

  if (compact && openInDialog) {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="neutral"
          onClick={() => setViewOpen(true)}
        >
          <ExternalLink className="size-3" />
          {proofType === "IMAGE"
            ? proofImages.length > 1
              ? "View images"
              : "View image"
            : "View proof"}
        </Button>
        <TaskProofViewDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          proofType={proofType}
          proofUrl={proofUrl}
          proofNote={proofNote}
        />
      </>
    )
  }

  if (compact && proofLinks.length > 1) {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="neutral"
          onClick={() => setViewOpen(true)}
        >
          <ExternalLink className="size-3" />
          View proofs
        </Button>
        <TaskProofViewDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          proofType={proofType}
          proofUrl={proofUrl}
          proofNote={proofNote}
        />
      </>
    )
  }

  if (compact && proofUrl && isHttpProofUrl(proofUrl)) {
    return (
      <Button type="button" size="sm" variant="neutral" asChild>
        <a href={proofUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="size-3" />
          Open proof
        </a>
      </Button>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <TaskProofDisplay
        proofType={proofType}
        proofUrl={proofUrl}
        proofNote={proofNote}
        mediaClassName={mediaClassName}
      />
      {openInDialog ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="neutral"
            onClick={() => setViewOpen(true)}
          >
            <ExternalLink className="size-3" />
            {proofType === "IMAGE" ? "View full image" : "View proof"}
          </Button>
          <TaskProofViewDialog
            open={viewOpen}
            onOpenChange={setViewOpen}
            proofType={proofType}
            proofUrl={proofUrl}
            proofNote={proofNote}
          />
        </>
      ) : null}
    </div>
  )
}
