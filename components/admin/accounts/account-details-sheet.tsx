"use client"

import { KeyRound, Pencil, Trash2 } from "lucide-react"

import {
  AccountStatusBadge,
  AccountTypeBadge,
} from "@/components/admin/accounts/account-status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AccountTimelineSection } from "@/components/admin/accounts/account-timeline-section"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { AccountListItem } from "@/lib/auth/accounts"

type AccountDetailsSheetProps = {
  account: AccountListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (account: AccountListItem) => void
  onForcePassword: (account: AccountListItem) => void
  onSoftDelete: (account: AccountListItem) => void
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded"
  }

  return dateTimeFormatter.format(new Date(value))
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className ?? "gap-0 py-0 shadow-none"}>
      <CardHeader className="items-center border-b-2 border-border px-4 py-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  )
}

export function AccountDetailsSheet({
  account,
  open,
  onOpenChange,
  onEdit,
  onForcePassword,
  onSoftDelete,
}: AccountDetailsSheetProps) {
  const activeBrandAccess =
    account?.brandAccess.filter(
      (access) => access.isActive && access.revokedAt === null,
    ) ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-svh w-[95vw] flex-col gap-0 overflow-hidden px-4 sm:max-w-4xl! sm:w-[50vw]! xl:max-w-6xl!">
        <SheetHeader className="shrink-0 pb-4">
          {account ? (
            <>
              <SheetTitle className="flex flex-wrap items-center gap-3 font-medium">
                <UserAvatar
                  profileId={account.id}
                  name={account.fullName}
                  email={account.email}
                  imageUrl={account.imageUrl}
                  size="lg"
                />
                <span className="text-xl font-bold sm:text-2xl">
                  Account Details
                </span>
                <AccountStatusBadge status={account.status} />
                <AccountTypeBadge accountType={account.accountType} />
              </SheetTitle>
              <SheetDescription>
                {account.fullName} / {account.email}
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle>Account Details</SheetTitle>
              <SheetDescription>
                Review account details and activity.
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {account ? (
          <ScrollArea className="min-h-0 flex-1 pr-3" scrollbars="vertical">
            <div className="grid min-w-0 grid-cols-1 gap-4 pb-6 xl:grid-cols-[2fr_1fr]">
              <div className="min-w-0 space-y-4">
                <Section title="Profile Details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name" value={account.fullName} />
                    <Field label="Email" value={account.email} />
                    <Field
                      label="Account Type"
                      value={<AccountTypeBadge accountType={account.accountType} />}
                    />
                    <Field
                      label="Status"
                      value={<AccountStatusBadge status={account.status} />}
                    />
                    <Field
                      label="Department"
                      value={account.department ?? "Not set"}
                    />
                    <Field
                      label="Phone"
                      value={account.phoneNumber ?? "Not set"}
                    />

                  </div>
                </Section>

                <Section title="Brand Access">
                  {activeBrandAccess.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No brand access assigned.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeBrandAccess.map((access) => (
                        <div
                          key={access.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-border bg-muted/20 p-3"
                        >
                          <span className="font-bold">{access.brandName}</span>
                          <Badge variant="neutral">{access.roleName}</Badge>
                          {access.isPrimary ? (
                            <Badge variant="secondary">Primary</Badge>
                          ) : null}
                          <AccountStatusBadge
                            status={access.isActive ? "ACTIVE" : "DISABLED"}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Account Timeline">
                  <AccountTimelineSection
                    logs={account.logs}
                    targetFullName={account.fullName}
                  />
                </Section>
              </div>

              <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
                <Section title="Account Metadata">
                  <Field label="Profile ID" value={account.id} />
                  <Field label="Account Type" value={account.accountType} />
                  <Field label="Created" value={formatDateTime(account.createdAt)} />
                  <Field label="Updated" value={formatDateTime(account.updatedAt)} />
                </Section>

                <Section title="Security">
                  <Field
                    label="Must Change Password"
                    value={account.mustChangePassword ? "Yes" : "No"}
                  />
                  <Field
                    label="Last Password Change"
                    value={formatDateTime(account.passwordChangedAt)}
                  />
                  <Field
                    label="First Login Completed"
                    value={formatDateTime(account.firstLoginCompletedAt)}
                  />
                  {account.deletedAt ? (
                    <Field label="Deleted At" value={formatDateTime(account.deletedAt)} />
                  ) : null}
                  {account.deletedReason ? (
                    <Field label="Deleted Reason" value={account.deletedReason} />
                  ) : null}
                </Section>

                <Section title="Available Actions">
                  <div className="grid gap-2">
                    <Button type="button" onClick={() => onEdit(account)}>
                      <Pencil className="size-4" />
                      Edit account
                    </Button>
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={() => onForcePassword(account)}
                      disabled={account.status === "DELETED"}
                    >
                      <KeyRound className="size-4" />
                      Force change password
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onSoftDelete(account)}
                      disabled={account.status === "DELETED"}
                    >
                      <Trash2 className="size-4" />
                      Delete account
                    </Button>
                  </div>
                </Section>
              </aside>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
