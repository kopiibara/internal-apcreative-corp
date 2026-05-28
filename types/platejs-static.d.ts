declare module "platejs/static" {
  import type * as React from "react"

  export type PlateStaticProps = Record<string, unknown> & {
    className?: string
  }

  export const PlateStatic: React.ComponentType<PlateStaticProps>
}

