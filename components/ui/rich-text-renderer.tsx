import {
  isSafeRichTextUrl,
  parseRichTextDocument,
  type RichTextNode,
} from "@/lib/rich-text/rich-text"
import { cn } from "@/lib/utils"

type RichTextRendererProps = {
  value: string | null | undefined
  emptyText?: string
  className?: string
}

function renderNode(node: RichTextNode, key: string): React.ReactNode {
  if ("text" in node) {
    let content: React.ReactNode = node.text

    if (node.bold) {
      content = <strong>{content}</strong>
    }

    if (node.italic) {
      content = <em>{content}</em>
    }

    if (node.underline) {
      content = <span className="underline underline-offset-2">{content}</span>
    }

    return <span key={key}>{content}</span>
  }

  const children = node.children.map((child, index) =>
    renderNode(child, `${key}-${index}`),
  )

  switch (node.type) {
    case "heading-one":
      return (
        <h2 key={key} className="text-lg font-black leading-snug">
          {children}
        </h2>
      )
    case "heading-two":
      return (
        <h3 key={key} className="text-base font-black leading-snug">
          {children}
        </h3>
      )
    case "bulleted-list":
      return (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {children}
        </ul>
      )
    case "numbered-list":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {children}
        </ol>
      )
    case "list-item":
      return <li key={key}>{children}</li>
    case "link":
      return isSafeRichTextUrl(node.url) ? (
        <a
          key={key}
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline underline-offset-4"
        >
          {children}
        </a>
      ) : (
        <span key={key}>{children}</span>
      )
    default:
      return (
        <p key={key} className="whitespace-pre-wrap">
          {children}
        </p>
      )
  }
}

export function RichTextRenderer({
  value,
  emptyText = "No details provided.",
  className,
}: RichTextRendererProps) {
  const document = parseRichTextDocument(value)

  if (document) {
    return (
      <div className={cn("space-y-2 break-words leading-relaxed", className)}>
        {document.content.map((node, index) => renderNode(node, String(index)))}
      </div>
    )
  }

  if (!value?.trim()) {
    return (
      <p className={cn("text-muted-foreground", className)}>{emptyText}</p>
    )
  }

  return (
    <p className={cn("whitespace-pre-wrap break-words leading-relaxed", className)}>
      {value}
    </p>
  )
}
