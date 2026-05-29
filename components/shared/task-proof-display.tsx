"use client"

import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  isHttpProofUrl,
  isTaskProofDataUrl,
} from "@/lib/tasks/task-proof-media"
import type { TaskProofType } from "@/lib/tasks/task-type"
import { cn } from "@/lib/utils"

type TaskProofDisplayProps = {
  proofType: TaskProofType | null
  proofUrl: string | null
  proofNote?: string | null
  className?: string
  mediaClassName?: string
}

function isImageProof(proofType: TaskProofType | null, proofUrl: string) {
  return (
    proofType === "IMAGE" ||
    proofUrl.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(proofUrl)
  )
}

export function TaskProofDisplay({
  proofType,
  proofUrl,
  proofNote,
  className,
  mediaClassName,
}: TaskProofDisplayProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {proofNote ? (
        <p className="whitespace-pre-wrap break-words rounded-lg border-2 border-border bg-muted/20 p-3 text-sm leading-relaxed">
          {proofNote}
        </p>
      ) : null}

      {proofUrl ? (
        <>
          {isImageProof(proofType, proofUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element -- proof may be a data URL
            <img
              src={proofUrl}
              alt="Submitted task proof"
              className={cn(
                "max-h-56 w-full rounded-lg border-2 border-border object-contain bg-muted/20",
                mediaClassName,
              )}
            />
          ) : isHttpProofUrl(proofUrl) || !isTaskProofDataUrl(proofUrl) ? (
            <Button type="button" size="sm" variant="neutral" asChild>
              <a href={proofUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3" />
                Open proof
              </a>
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
