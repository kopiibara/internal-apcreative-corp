import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { MetaBusinessPagePostRow } from "@/lib/meta/page-analytics"

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function MetaPostThumbnail({
  post,
  className = "h-16 w-16",
}: {
  post: Pick<MetaBusinessPagePostRow, "imageUrl" | "message">
  className?: string
}) {
  if (post.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.imageUrl}
        alt=""
        className={`rounded-md border bg-muted object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-md border bg-muted/60 text-xs text-muted-foreground ${className}`}
    >
      No image
    </div>
  )
}

export function MetaPostCaption({
  message,
  className = "line-clamp-2",
}: {
  message: string | null
  className?: string
}) {
  return (
    <span className={className}>{message?.trim() || "Untitled post"}</span>
  )
}

export function MetaPostDate({
  publishedAt,
}: {
  publishedAt: string | null
}) {
  if (!publishedAt) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="whitespace-nowrap">
      {dateFormatter.format(new Date(publishedAt))}
    </span>
  )
}

export function MetaPostEngagementStats({
  post,
}: {
  post: Pick<
    MetaBusinessPagePostRow,
    "reactions" | "comments" | "shares" | "engagementTotal"
  >
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>
        <span className="font-medium text-foreground">{post.reactions}</span>{" "}
        reactions
      </span>
      <span>
        <span className="font-medium text-foreground">{post.comments}</span>{" "}
        comments
      </span>
      <span>
        <span className="font-medium text-foreground">{post.shares}</span> shares
      </span>
      <span>
        <span className="font-medium text-foreground">
          {post.engagementTotal}
        </span>{" "}
        engagement
      </span>
    </div>
  )
}

export function MetaPostExternalLink({
  permalink,
  label = "Open on Facebook",
}: {
  permalink: string | null
  label?: string
}) {
  if (!permalink) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <a
      href={permalink}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {label}
    </a>
  )
}

export function MetaViewAllPostsButton({
  pageKey = "neon-nights",
  label = "View All Facebook Posts",
}: {
  pageKey?: string
  label?: string
}) {
  return (
    <Button type="button" variant="default" asChild>
      <Link href={`/admin/platform-analytics/meta/posts?pageKey=${pageKey}`}>
        {label}
      </Link>
    </Button>
  )
}
