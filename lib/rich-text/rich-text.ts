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
