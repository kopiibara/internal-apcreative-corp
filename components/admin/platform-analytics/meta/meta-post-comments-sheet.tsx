"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  fetchMetaPostCommentsAction,
  type MetaPostCommentView,
} from "@/app/admin/platform-analytics/actions"
import {
  MetaPostCaption,
  MetaPostDate,
  MetaPostEngagementStats,
  MetaPostExternalLink,
  MetaPostThumbnail,
} from "@/components/admin/platform-analytics/meta/meta-post-shared"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { MetaBusinessPagePostRow } from "@/lib/meta/page-analytics"
import type { MetaPageConfigKey } from "@/lib/meta/pages-config"

type MetaPostCommentsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageKey: MetaPageConfigKey
  post: MetaBusinessPagePostRow | null
}

export function MetaPostCommentsSheet({
  open,
  onOpenChange,
  pageKey,
  post,
}: MetaPostCommentsSheetProps) {
  const [comments, setComments] = useState<MetaPostCommentView[]>([])
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !post) {
      return
    }

    startTransition(async () => {
      const result = await fetchMetaPostCommentsAction({
        pageKey,
        postId: post.postId,
      })

      if (!result.success || !result.data) {
        toast.error(result.message)
        setComments([])
        setUnavailableMessage("Sync failed")
        return
      }

      setComments(result.data.comments)
      setUnavailableMessage(result.data.unavailableMessage)
    })
  }, [open, pageKey, post])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle>Post comments</SheetTitle>
          <SheetDescription>
            {post
              ? `${post.comments.toLocaleString("en-PH")} synced comment(s) on this post`
              : "Select a post to view comments."}
          </SheetDescription>
        </SheetHeader>

        {post ? (
          <div className="space-y-4 border-b border-border py-4">
            <div className="flex gap-3">
              <MetaPostThumbnail post={post} />
              <div className="min-w-0 flex-1 space-y-2">
                <MetaPostCaption message={post.message} className="line-clamp-3" />
                <MetaPostDate publishedAt={post.publishedAt} />
                <MetaPostEngagementStats post={post} />
                <MetaPostExternalLink permalink={post.permalink} />
              </div>
            </div>
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1 py-4">
          <div className="space-y-3 pr-4">
            {isPending ? (
              <p className="text-sm text-muted-foreground">Loading comments…</p>
            ) : unavailableMessage ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                {unavailableMessage}
              </p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No comments returned from Meta for this post.
              </p>
            ) : (
              comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-lg border border-border bg-card/50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{comment.authorName}</span>
                    {comment.createdAt ? (
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("en-PH")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap">{comment.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{comment.likeCount} likes</span>
                    {comment.replyCount > 0 ? (
                      <span>{comment.replyCount} replies</span>
                    ) : null}
                    {comment.permalink ? (
                      <a
                        href={comment.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Permalink
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
