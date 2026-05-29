"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/** Applied to `<form>` wrappers inside dialogs (scrollable body + footer). */
export const dialogFormClassName =
  "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[120] bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[130] flex max-h-[90dvh] min-h-0 w-full max-w-[calc(100%-2rem)] min-w-0 translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-lg border-2 border-border p-0 shadow-[var(--shadow-hard-sm)] duration-200 sm:max-w-lg",
          "[&>form]:grid [&>form]:min-h-0 [&>form]:flex-1 [&>form]:grid-rows-[minmax(0,1fr)_auto] [&>form]:overflow-hidden",
          "[&>[data-slot=dialog-body-host]]:min-h-0 [&>[data-slot=dialog-body-host]]:flex-1 [&>[data-slot=dialog-body-host]]:overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-lg opacity-100 ring-offset-white focus:-hidden focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <X />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b-2 border-border px-6 py-4 pr-12 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  )
}

function DialogBody({
  className,
  children,
  viewportClassName,
  ...props
}: React.ComponentProps<typeof ScrollArea>) {
  return (
    <div
      data-slot="dialog-body-host"
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden",
        "h-full min-h-0",
        className,
      )}
    >
      <ScrollArea
        data-slot="dialog-body"
        className="absolute inset-0 size-full"
        viewportClassName={cn("px-6 py-4", viewportClassName)}
        {...props}
      >
        <div className="min-w-0 pr-3">{children}</div>
      </ScrollArea>
    </div>
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-3 border-t-2 border-border bg-background px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-heading leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm font-base text-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
