"use client"

import { useEffect, useState } from "react"

import {
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
  ThinkingStep,
} from "@/components/ui/thinking-steps"
import type { AdsPlatform } from "@/lib/ads-campaigns-types"
import type { IconName } from "@/lib/icon-context"

type ImportStep = {
  icon: IconName
  label: string
}

const GOOGLE_IMPORT_STEPS: ImportStep[] = [
  { icon: "search", label: "Reading CSV file" },
  { icon: "check", label: "Validating Google Ads template" },
  { icon: "square-library", label: "Parsing daily metric rows" },
  { icon: "loader", label: "Saving metric records" },
  { icon: "rotate-ccw", label: "Refreshing dashboard" },
]

const META_IMPORT_STEPS: ImportStep[] = [
  { icon: "search", label: "Reading CSV file" },
  { icon: "check", label: "Validating Meta export template" },
  { icon: "square-library", label: "Parsing campaign rows" },
  { icon: "loader", label: "Saving campaign records" },
  { icon: "rotate-ccw", label: "Refreshing dashboard" },
]

type CsvImportThinkingStepsProps = {
  platform: AdsPlatform
  isComplete: boolean
  fileName?: string | null
}

export function CsvImportThinkingSteps({
  platform,
  isComplete,
  fileName,
}: CsvImportThinkingStepsProps) {
  const steps =
    platform === "GOOGLE" ? GOOGLE_IMPORT_STEPS : META_IMPORT_STEPS
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (isComplete) {
      setActiveIndex(steps.length)
      return
    }

    setActiveIndex(0)

    const interval = window.setInterval(() => {
      setActiveIndex((current) =>
        current >= steps.length - 1 ? current : current + 1,
      )
    }, 650)

    return () => window.clearInterval(interval)
  }, [isComplete, steps.length])

  const platformLabel =
    platform === "GOOGLE" ? "Google Ads" : platform === "META" ? "Meta Ads" : "TikTok Ads"

  const visibleSteps = isComplete
    ? [
        ...steps.map((step) => ({ ...step, status: "complete" as const })),
        { icon: "check" as const, label: "Done", status: "complete" as const },
      ]
    : steps.map((step, index) => ({
        ...step,
        status:
          index < activeIndex
            ? ("complete" as const)
            : index === activeIndex
              ? ("active" as const)
              : ("pending" as const),
      }))

  return (
    <ThinkingSteps className="w-full max-w-none" defaultOpen>
      <ThinkingStepsHeader>Importing {platformLabel}</ThinkingStepsHeader>
      <ThinkingStepsContent>
        {visibleSteps.map((step, index) => (
          <ThinkingStep
            key={`${step.label}-${index}`}
            index={index}
            icon={step.icon}
            label={step.label}
            description={
              index === 0 && fileName ? fileName : undefined
            }
            status={step.status}
            isLast={index === visibleSteps.length - 1}
          />
        ))}
      </ThinkingStepsContent>
    </ThinkingSteps>
  )
}
