"use client"

import { useCallback, useRef, useState } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.25

type ZoomableImageProps = {
  src: string
  alt: string
  className?: string
  viewportClassName?: string
  imageClassName?: string
}

export function ZoomableImage({
  src,
  alt,
  className,
  viewportClassName,
  imageClassName,
}: ZoomableImageProps) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPoint = useRef({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  const clampScale = useCallback(
    (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)),
    [],
  )

  const resetView = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const applyScale = useCallback(
    (updater: (current: number) => number) => {
      setScale((current) => {
        const next = clampScale(updater(current))
        if (next <= MIN_SCALE) {
          setPan({ x: 0, y: 0 })
        }
        return next
      })
    },
    [clampScale],
  )

  const zoomIn = () => applyScale((current) => current + SCALE_STEP)
  const zoomOut = () => applyScale((current) => current - SCALE_STEP)

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    applyScale((current) => current + delta)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= MIN_SCALE) return
    dragging.current = true
    lastPoint.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || scale <= MIN_SCALE) return
    const dx = event.clientX - lastPoint.current.x
    const dy = event.clientY - lastPoint.current.y
    lastPoint.current = { x: event.clientX, y: event.clientY }
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }))
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const canPan = scale > MIN_SCALE

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="neutral"
          aria-label="Zoom out"
          disabled={scale <= MIN_SCALE}
          onClick={zoomOut}
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-12 text-center text-xs font-medium tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          size="sm"
          variant="neutral"
          aria-label="Zoom in"
          disabled={scale >= MAX_SCALE}
          onClick={zoomIn}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="neutral"
          aria-label="Reset zoom"
          disabled={scale <= MIN_SCALE && pan.x === 0 && pan.y === 0}
          onClick={resetView}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
        <span className="text-xs text-muted-foreground">
          Scroll to zoom · drag to pan when zoomed
        </span>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-40 touch-none overflow-hidden rounded-lg border-2 border-border bg-muted/20",
          canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          viewportClassName,
        )}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="flex size-full min-h-40 items-center justify-center p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- proof may be a data URL */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={cn(
              "max-h-full max-w-full select-none object-contain transition-transform duration-75",
              imageClassName,
            )}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
