declare module "platejs/react" {
  import type * as React from "react"

  export type PlateContentProps = Record<string, unknown> & {
    className?: string
  }

  export type PlateViewProps = Record<string, unknown> & {
    className?: string
  }

  export const PlateContainer: React.ComponentType<Record<string, unknown>>
  export const PlateContent: React.ComponentType<PlateContentProps>
  export const PlateView: React.ComponentType<PlateViewProps>
}

