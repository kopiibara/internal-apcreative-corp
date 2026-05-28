"use client"

import * as React from "react"
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { RequiredLabel } from "@/components/ui/required-label"
import {
  EMPTY_RICH_TEXT_CONTENT,
  normalizeRichTextForStorage,
  parseRichTextDocument,
  serializeRichTextContent,
  type RichTextElement,
  type RichTextLeaf,
  type RichTextNode,
} from "@/lib/rich-text/rich-text"
import { cn } from "@/lib/utils"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: React.ReactNode
  required?: boolean
  placeholder?: string
  error?: string | null
  disabled?: boolean
  readOnly?: boolean
  minHeight?: number
  className?: string
  id?: string
  name?: string
}

type ToolbarState = {
  bold: boolean
  italic: boolean
  underline: boolean
  headingOne: boolean
  headingTwo: boolean
  bulletedList: boolean
  numberedList: boolean
  link: boolean
}

const emptyToolbarState: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  headingOne: false,
  headingTwo: false,
  bulletedList: false,
  numberedList: false,
  link: false,
}

const blockTags: Record<string, RichTextElement["type"]> = {
  H1: "heading-one",
  H2: "heading-two",
  LI: "list-item",
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function leafToHtml(node: RichTextLeaf) {
  let html = escapeHtml(node.text)

  if (node.bold) {
    html = `<strong>${html}</strong>`
  }

  if (node.italic) {
    html = `<em>${html}</em>`
  }

  if (node.underline) {
    html = `<u>${html}</u>`
  }

  return html
}

function nodeToHtml(node: RichTextNode): string {
  if ("text" in node) {
    return leafToHtml(node)
  }

  const children = node.children.map(nodeToHtml).join("")

  switch (node.type) {
    case "heading-one":
      return `<h1>${children}</h1>`
    case "heading-two":
      return `<h2>${children}</h2>`
    case "bulleted-list":
      return `<ul>${children}</ul>`
    case "numbered-list":
      return `<ol>${children}</ol>`
    case "list-item":
      return `<li>${children}</li>`
    case "link":
      return `<a href="${escapeHtml(node.url ?? "")}">${children}</a>`
    default:
      return `<p>${children || "<br>"}</p>`
  }
}

function valueToHtml(value: string) {
  const document = parseRichTextDocument(value)

  if (document) {
    return document.content.map(nodeToHtml).join("")
  }

  if (!value.trim()) {
    return "<p><br></p>"
  }

  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("")
}

function collectTextNodes(node: Node, marks: Omit<RichTextLeaf, "text"> = {}) {
  const nodes: RichTextNode[] = []

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      nodes.push({ text: child.textContent ?? "", ...marks })
      return
    }

    if (!(child instanceof HTMLElement)) {
      return
    }

    const tag = child.tagName

    const nextMarks = {
      ...marks,
      bold: marks.bold || tag === "B" || tag === "STRONG",
      italic: marks.italic || tag === "I" || tag === "EM",
      underline: marks.underline || tag === "U",
    }

    if (tag === "A") {
      nodes.push({
        type: "link",
        url: child.getAttribute("href") ?? undefined,
        children: collectTextNodes(child, nextMarks),
      })
      return
    }

    nodes.push(...collectTextNodes(child, nextMarks))
  })

  return nodes.length > 0 ? nodes : [{ text: "" }]
}

function elementToNode(element: Element): RichTextNode {
  if (element.tagName === "UL" || element.tagName === "OL") {
    return {
      type: element.tagName === "UL" ? "bulleted-list" : "numbered-list",
      children: Array.from(element.children).map(elementToNode),
    }
  }

  const directListChild = Array.from(element.children).find(
    (child) => child.tagName === "UL" || child.tagName === "OL",
  )

  if (directListChild && element.textContent === directListChild.textContent) {
    return elementToNode(directListChild)
  }

  return {
    type: blockTags[element.tagName] ?? "paragraph",
    children: collectTextNodes(element),
  }
}

function htmlToSerializedValue(element: HTMLElement) {
  const children = Array.from(element.children)

  const content =
    children.length > 0
      ? children.map(elementToNode)
      : [{ type: "paragraph" as const, children: collectTextNodes(element) }]

  return serializeRichTextContent(content)
}

function getSelectionElement() {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const node = selection.anchorNode

  if (!node) {
    return null
  }

  return node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement
}

function isSelectionInsideEditor(editor: HTMLElement) {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) {
    return false
  }

  const node = selection.anchorNode

  return Boolean(node && editor.contains(node))
}

function getActiveToolbarState(editor: HTMLElement): ToolbarState {
  if (!isSelectionInsideEditor(editor)) {
    return emptyToolbarState
  }

  const element = getSelectionElement()

  return {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    headingOne: Boolean(element?.closest("h1")),
    headingTwo: Boolean(element?.closest("h2")),
    bulletedList: Boolean(element?.closest("ul")),
    numberedList: Boolean(element?.closest("ol")),
    link: Boolean(element?.closest("a")),
  }
}

function ToolbarButton({
  label,
  children,
  disabled,
  active = false,
  onClick,
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
  active?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "size-8 shrink-0 rounded-md border border-transparent shadow-none",
        "hover:border-border hover:bg-white",
        active &&
        "border-border bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
      )}
    >
      {children}
    </Button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  label,
  required = false,
  placeholder,
  error,
  disabled = false,
  readOnly = false,
  minHeight = 160,
  className,
  id,
  name,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement | null>(null)
  const lastValueRef = React.useRef<string>("")
  const isDisabled = disabled || readOnly

  const [isFocused, setIsFocused] = React.useState(false)
  const [toolbarState, setToolbarState] =
    React.useState<ToolbarState>(emptyToolbarState)

  const updateToolbarState = React.useCallback(() => {
    const editor = editorRef.current

    if (!editor || isDisabled) {
      setToolbarState(emptyToolbarState)
      return
    }

    setToolbarState(getActiveToolbarState(editor))
  }, [isDisabled])

  React.useEffect(() => {
    const editor = editorRef.current

    if (!editor || lastValueRef.current === value) {
      return
    }

    editor.innerHTML = valueToHtml(value)
    lastValueRef.current = value
  }, [value])

  React.useEffect(() => {
    function handleSelectionChange() {
      const editor = editorRef.current

      if (!editor) {
        return
      }

      if (isSelectionInsideEditor(editor)) {
        setIsFocused(true)
        updateToolbarState()
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [updateToolbarState])

  function emitChange() {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const nextValue = htmlToSerializedValue(editor)
    lastValueRef.current = nextValue
    onChange(nextValue)
    requestAnimationFrame(updateToolbarState)
  }

  function command(name: string, commandValue?: string) {
    if (isDisabled) {
      return
    }

    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    emitChange()
    updateToolbarState()
  }

  function createLink() {
    if (isDisabled) {
      return
    }

    const url = window.prompt("Paste a link")

    if (!url) {
      return
    }

    command("createLink", url)
  }

  function handleFocus() {
    setIsFocused(true)
    updateToolbarState()
  }

  function handleBlur() {
    setIsFocused(false)
    setToolbarState(emptyToolbarState)
    onChange(normalizeRichTextForStorage(lastValueRef.current || value))
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <RequiredLabel htmlFor={id} required={required}>
          {label}
        </RequiredLabel>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-lg border-2 border-border bg-background transition",
          error && "border-destructive",
          isFocused &&
          !error &&
          "border-primary ring-2 ring-primary/25",
          isDisabled && "opacity-70",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-1 border-b-2 border-border bg-secondary-background px-2 py-1 transition",
            isFocused && "bg-primary/10",
          )}
        >
          <ToolbarButton
            label="Bold"
            disabled={isDisabled}
            active={toolbarState.bold}
            onClick={() => command("bold")}
          >
            <Bold className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Italic"
            disabled={isDisabled}
            active={toolbarState.italic}
            onClick={() => command("italic")}
          >
            <Italic className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Underline"
            disabled={isDisabled}
            active={toolbarState.underline}
            onClick={() => command("underline")}
          >
            <Underline className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Heading 1"
            disabled={isDisabled}
            active={toolbarState.headingOne}
            onClick={() => command("formatBlock", "h1")}
          >
            <Heading1 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Heading 2"
            disabled={isDisabled}
            active={toolbarState.headingTwo}
            onClick={() => command("formatBlock", "h2")}
          >
            <Heading2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Bullet list"
            disabled={isDisabled}
            active={toolbarState.bulletedList}
            onClick={() => command("insertUnorderedList")}
          >
            <List className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Numbered list"
            disabled={isDisabled}
            active={toolbarState.numberedList}
            onClick={() => command("insertOrderedList")}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>


          <span className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            label="Undo"
            disabled={isDisabled}
            onClick={() => command("undo")}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Redo"
            disabled={isDisabled}
            onClick={() => command("redo")}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>

        <div className="relative">
          <div
            ref={editorRef}
            id={id}
            role="textbox"
            aria-multiline="true"
            aria-required={required || undefined}
            aria-invalid={Boolean(error) || undefined}
            contentEditable={!isDisabled}
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onInput={emitChange}
            onKeyUp={updateToolbarState}
            onMouseUp={updateToolbarState}
            className={cn(
              "prose-none min-h-[var(--rich-text-min-height)] w-full px-3 py-3 text-sm leading-relaxed outline-none",
              "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
              "[&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4",
              "[&_h1]:text-lg [&_h1]:font-black",
              "[&_h2]:text-base [&_h2]:font-black",
              "[&_ol]:list-decimal [&_ol]:pl-5",
              "[&_ul]:list-disc [&_ul]:pl-5",
            )}
            style={
              {
                "--rich-text-min-height": `${minHeight}px`,
              } as React.CSSProperties
            }
          />

          {name ? (
            <input
              type="hidden"
              name={name}
              value={value || serializeRichTextContent(EMPTY_RICH_TEXT_CONTENT)}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  )
}