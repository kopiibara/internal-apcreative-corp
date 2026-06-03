"use client"

import { ExternalLink } from "lucide-react"

import { ZoomableImage } from "@/components/shared/zoomable-image"
import { Button } from "@/components/ui/button"
import { RichTextRenderer } from "@/components/ui/rich-text-renderer"
import {
  getProofImageList,
  getProofLinkList,
  isHttpProofUrl,
  isProofDataUrl,
} from "@/lib/proof/proof-media"
import type { ProofSubmitType } from "@/lib/proof/proof-types"
import type { TaskProofType } from "@/lib/tasks/task-type"
import { cn } from "@/lib/utils"

type TaskProofDisplayProps = {
  proofType: TaskProofType | ProofSubmitType | null
  proofUrl: string | null
  proofNote?: string | null
  className?: string
  mediaClassName?: string
  viewportClassName?: string
  zoomable?: boolean
}

function isImageProof(
  proofType: TaskProofType | ProofSubmitType | null,
  proofUrl: string,
) {
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
  viewportClassName,
  zoomable = true,
}: TaskProofDisplayProps) {
  const proofLinks = proofType === "LINK" ? getProofLinkList(proofUrl) : []
  const proofImages = proofType === "IMAGE" ? getProofImageList(proofUrl) : []

  return (
    <div className={cn("space-y-3", className)}>
      {proofNote ? (
        <div className="rounded-lg border-2 border-border bg-muted/20 p-3 text-sm">
          <RichTextRenderer value={proofNote} />
        </div>
      ) : null}

      {proofUrl ? (
        <>
          {proofLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {proofLinks.map((link, index) => (
                <Button
                  key={`${link}-${index}`}
                  type="button"
                  size="sm"
                  variant="neutral"
                  asChild
                >
                  <a href={link} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3" />
                    {proofLinks.length === 1
                      ? "Open proof"
                      : `Open proof ${index + 1}`}
                  </a>
                </Button>
              ))}
            </div>
          ) : proofImages.length > 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {proofImages.map((image, index) => (
                <div key={`${image.slice(0, 48)}-${index}`} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Image proof {index + 1}
                  </p>
                  {zoomable ? (
                    <ZoomableImage
                      src={image}
                      alt={`Submitted task proof ${index + 1}`}
                      viewportClassName={cn(
                        "max-h-56 sm:max-h-72",
                        viewportClassName,
                      )}
                      imageClassName={mediaClassName}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- proof may be a data URL
                    <img
                      src={image}
                      alt={`Submitted task proof ${index + 1}`}
                      className={cn(
                        "max-h-40 w-full rounded-lg border-2 border-border object-contain bg-muted/20",
                        mediaClassName,
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : isImageProof(proofType, proofUrl) ? (
            zoomable ? (
              <ZoomableImage
                src={proofUrl}
                alt="Submitted task proof"
                viewportClassName={cn("max-h-56 sm:max-h-72", viewportClassName)}
                imageClassName={mediaClassName}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- proof may be a data URL
              <img
                src={proofUrl}
                alt="Submitted task proof"
                className={cn(
                  "max-h-40 w-full rounded-lg border-2 border-border object-contain bg-muted/20",
                  mediaClassName,
                )}
              />
            )
          ) : isHttpProofUrl(proofUrl) || !isProofDataUrl(proofUrl) ? (
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
