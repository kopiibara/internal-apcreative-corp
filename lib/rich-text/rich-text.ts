export type RichTextLeaf = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type RichTextElement = {
  type:
    | "paragraph"
    | "heading-one"
    | "heading-two"
    | "bulleted-list"
    | "numbered-list"
    | "list-item"
    | "link"
  url?: string
  children: RichTextNode[]
}

export type RichTextNode = RichTextElement | RichTextLeaf

export type RichTextDocument = {
  type: "platejs"
  version: 1
  content: RichTextNode[]
}

export const EMPTY_RICH_TEXT_CONTENT: RichTextNode[] = [
  { type: "paragraph", children: [{ text: "" }] },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function isRichTextDocument(value: unknown): value is RichTextDocument {
  return (
    isRecord(value) &&
    value.type === "platejs" &&
    value.version === 1 &&
    Array.isArray(value.content)
  )
}

export function parseRichTextDocument(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(value)

    return isRichTextDocument(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function serializeRichTextContent(content: RichTextNode[]) {
  return JSON.stringify({
    type: "platejs",
    version: 1,
    content,
  } satisfies RichTextDocument)
}

export function normalizeRichTextForStorage(value: string | null | undefined) {
  const text = value?.trim() ?? ""

  if (!text) {
    return ""
  }

  if (parseRichTextDocument(text)) {
    return text
  }

  return serializeRichTextContent([
    {
      type: "paragraph",
      children: [{ text }],
    },
  ])
}

function collectPlainTextFromNode(node: unknown): string {
  if (!isRecord(node)) {
    return ""
  }

  if (typeof node.text === "string") {
    return node.text
  }

  if (Array.isArray(node.children)) {
    return node.children.map(collectPlainTextFromNode).join(" ")
  }

  return ""
}

export function richTextToPlainText(value: string | null | undefined) {
  const document = parseRichTextDocument(value)

  if (!document) {
    return value?.trim() ?? ""
  }

  return document.content
    .map(collectPlainTextFromNode)
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function isRichTextEmpty(value: string | null | undefined) {
  return richTextToPlainText(value).length === 0
}

export function richTextExcerpt(
  value: string | null | undefined,
  maxLength = 120,
) {
  const plainText = richTextToPlainText(value)

  if (plainText.length <= maxLength) {
    return plainText
  }

  return `${plainText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function countRichTextListItems(node: RichTextNode): number {
  if ("text" in node) {
    return 0
  }

  if (node.type === "list-item") {
    return 1
  }

  return node.children.reduce(
    (total, child) => total + countRichTextListItems(child),
    0,
  )
}

export function getRichTextListItemCount(content: RichTextNode[]) {
  return content.reduce(
    (total, node) => total + countRichTextListItems(node),
    0,
  )
}

export function truncateRichTextListItems(
  content: RichTextNode[],
  maxItems: number,
): RichTextNode[] {
  let remaining = maxItems

  function processNode(node: RichTextNode): RichTextNode | null {
    if ("text" in node) {
      return node
    }

    if (node.type === "list-item") {
      if (remaining <= 0) {
        return null
      }

      remaining -= 1
      return node
    }

    if (node.type === "bulleted-list" || node.type === "numbered-list") {
      const children = node.children
        .map(processNode)
        .filter((child): child is RichTextNode => child !== null)

      if (children.length === 0) {
        return null
      }

      return { ...node, children }
    }

    const children = node.children
      .map(processNode)
      .filter((child): child is RichTextNode => child !== null)

    if (children.length === 0) {
      return node.type === "paragraph"
        ? { ...node, children: [{ text: "" }] }
        : null
    }

    return { ...node, children }
  }

  return content
    .map(processNode)
    .filter((node): node is RichTextNode => node !== null)
}

export function truncateRichTextForPreview(
  value: string | null | undefined,
  maxListItems: number,
) {
  const document = parseRichTextDocument(value)

  if (!document) {
    return {
      previewValue: value ?? "",
      isListTruncated: false,
    }
  }

  const totalListItems = getRichTextListItemCount(document.content)

  if (totalListItems <= maxListItems) {
    return {
      previewValue: value ?? "",
      isListTruncated: false,
    }
  }

  return {
    previewValue: serializeRichTextContent(
      truncateRichTextListItems(document.content, maxListItems),
    ),
    isListTruncated: true,
  }
}

export function isSafeRichTextUrl(value: string | undefined) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)

    return ["http:", "https:", "mailto:"].includes(url.protocol)
  } catch {
    return false
  }
}
