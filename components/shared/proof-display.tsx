"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"

import { TaskProofDisplay } from "@/components/shared/task-proof-display"
import { TaskProofViewDialog } from "@/components/shared/task-proof-view-dialog"
import { Button } from "@/components/ui/button"
import {
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
  const proofType =
    proofTypeProp ?? inferProofSubmitType(proofUrl, proofNote)
  const hasProof = Boolean(proofUrl?.trim() || proofNote?.trim())

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
          {proofType === "IMAGE" ? "View image" : "View proof"}
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
