import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type UnauthorizedStateProps = {
  title?: string
  description?: string
  permissionKey?: string
  homeHref: string
  homeLabel: string
}

export function UnauthorizedState({
  title = "You do not have permission to view this page.",
  description = "Your account is signed in, but this route requires access that has not been granted.",
  permissionKey,
  homeHref,
  homeLabel,
}: UnauthorizedStateProps) {
  return (
    <div className="flex min-h-[min(24rem,calc(100vh-8rem))] items-center justify-center">
      <Card className="w-full max-w-lg border-2 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border-2 border-border bg-muted/30">
              <ShieldAlert className="size-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {permissionKey ? (
            <p className="rounded-md border-2 border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Required permission:{" "}
              <span className="font-mono text-foreground">{permissionKey}</span>
            </p>
          ) : null}
          <Button asChild variant="neutral" className="w-fit">
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
