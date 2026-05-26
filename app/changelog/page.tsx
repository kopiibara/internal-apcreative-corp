import { readFile } from "fs/promises"
import path from "path"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { appVersion } from "@/lib/app-version"

export const dynamic = "force-dynamic"

async function getChangelog() {
  try {
    return await readFile(
      path.join(process.cwd(), "public", "CHANGELOG.md"),
      "utf8",
    )
  } catch {
    return null
  }
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/)

  return lines.map((line, index) => {
    if (!line.trim()) {
      return <div key={index} className="h-3" />
    }

    if (line.startsWith("# ")) {
      return (
        <h2 key={index} className="text-2xl font-bold">
          {line.slice(2)}
        </h2>
      )
    }

    if (line.startsWith("## ")) {
      return (
        <h3 key={index} className="pt-3 text-xl font-bold">
          {line.slice(3)}
        </h3>
      )
    }

    if (line.startsWith("### ")) {
      return (
        <h4 key={index} className="pt-2 text-base font-bold">
          {line.slice(4)}
        </h4>
      )
    }

    if (line.startsWith("- ")) {
      return (
        <li key={index} className="ml-5 list-disc text-sm leading-relaxed">
          {line.slice(2)}
        </li>
      )
    }

    return (
      <p key={index} className="text-sm leading-relaxed text-muted-foreground">
        {line}
      </p>
    )
  })
}

export default async function ChangelogPage() {
  const changelog = await getChangelog()

  return (
    <main className="min-h-svh bg-background p-4 sm:p-8">
      <Card className="mx-auto max-w-4xl border-2 border-border shadow-none">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Changelog</CardTitle>
            <Badge variant="secondary">Version v{appVersion}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {changelog?.trim() ? (
            renderMarkdown(changelog)
          ) : (
            <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No changelog entries have been generated yet.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
