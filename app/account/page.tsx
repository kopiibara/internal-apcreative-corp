import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"

import { AvatarSettings } from "@/components/account/avatar-settings"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { can } from "@/lib/permissions"
import {
  isAdminAccountType,
  requireAuth,
  type AccountType,
} from "@/lib/auth/auth-session"
import { query } from "@/lib/db"
import {
  canAccessEmployeeTaskPage,
  canAccessEmployeeToDoTaskBoard,
} from "@/lib/tasks/employee-task-access"
import { getEmployeeActionableTaskCount } from "@/lib/tasks/tasks"
import { cn } from "@/lib/utils"

type RoleSlugRow = {
  slug: string
}

type BrandAccessRow = {
  brand_name: string
  brand_slug: string
  role_name: string
  role_slug: string
  is_primary: boolean
}

async function getActiveRoleSlugs(profileId: number) {
  const result = await query<RoleSlugRow>(
    `
    SELECT DISTINCT r.slug
    FROM user_brand_access uba
    JOIN "role" r ON r.id = uba.role_id
    WHERE uba.profile_id = $1
      AND uba.is_active = true
    ORDER BY r.slug ASC
    `,
    [profileId],
  )

  return result.rows.map((row) => row.slug)
}

async function getBrandAccess(profileId: number) {
  const result = await query<BrandAccessRow>(
    `
    SELECT
      b.name AS brand_name,
      b.slug AS brand_slug,
      r.name AS role_name,
      r.slug AS role_slug,
      uba.is_primary
    FROM user_brand_access uba
    JOIN brand b ON b.id = uba.brand_id
    JOIN "role" r ON r.id = uba.role_id
    WHERE uba.profile_id = $1
      AND uba.is_active = true
      AND b.is_active = true
    ORDER BY
      CASE WHEN b.slug = 'all-brand' THEN 0 ELSE 1 END,
      uba.is_primary DESC,
      b.name ASC,
      r.name ASC
    `,
    [profileId],
  )

  return result.rows
}

function formatAccountType(accountType: AccountType) {
  return accountType
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}

function getProfileStatusBadgeClassName(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-700 bg-emerald-100 text-emerald-950";
  }

  if (status === "INVITED") {
    return "border-sky-700 bg-sky-100 text-sky-950";
  }

  if (status === "SUSPENDED") {
    return "border-amber-700 bg-amber-100 text-amber-950";
  }

  if (status === "DISABLED" || status === "ARCHIVED" || status === "DELETED") {
    return "border-zinc-700 bg-zinc-100 text-zinc-950";
  }

  return "border-border bg-secondary text-secondary-foreground";
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-lg border-2 border-border bg-background px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold">
        {value}
      </div>
    </div>
  )
}

export default async function AccountPage() {
  const { profile, user } = await requireAuth()
  const isAdmin = isAdminAccountType(profile.account_type)
  const roleSlugs = await getActiveRoleSlugs(profile.id)
  const brandAccess = await getBrandAccess(profile.id)
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/employee/dashboard"

  const [canAccessTaskBoard, canAccessReminders, canAccessAdsCampaigns] =
    isAdmin
      ? [false, false, false]
      : await Promise.all([
        canAccessEmployeeToDoTaskBoard(profile.auth_user_id, profile.id),
        canAccessEmployeeTaskPage(
          profile.auth_user_id,
          profile.account_type,
          profile.id,
        ),
        can(profile.auth_user_id, "ads_campaigns.view"),
      ])
  const actionableTaskCount =
    !isAdmin && canAccessTaskBoard
      ? await getEmployeeActionableTaskCount(profile.id)
      : 0

  return (
    <DashboardShell
      role={isAdmin ? "admin" : "employee"}
      title="Account Settings"
      employeeActionableTaskCount={actionableTaskCount}
      user={{
        profileId: profile.id,
        name: profile.full_name,
        email: profile.email,
        accountType: profile.account_type,
        roleSlugs,
        canAccessAdsCampaigns,
        canAccessTaskBoard,
        canAccessReminders,
        imageUrl: user.image ?? null,
        mustChangePassword: profile.must_change_password,
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal">
              Account Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your dashboard profile and access details.
            </p>
          </div>
          <Button asChild variant="neutral" className="shrink-0">
            <Link href={dashboardHref}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        </div>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <UserAvatar
              profileId={profile.id}
              name={profile.full_name}
              email={profile.email}
              imageUrl={user.image ?? null}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="break-words text-xl">
                {profile.full_name}
              </CardTitle>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {profile.email}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0",
                getProfileStatusBadgeClassName(profile.status),
              )}
            >
              {profile.status}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow
              label="Account type"
              value={formatAccountType(profile.account_type)}
            />
            <DetailRow label="Position" value={profile.position ?? "Not set"} />
            <DetailRow
              label="Department"
              value={profile.department ?? "Not set"}
            />
            <DetailRow
              label="Role Access"
              value={brandAccess.length > 0 ? (
                <>
                  {brandAccess.map((access) => (
                    <div
                      key={`${access.brand_slug}-${access.role_slug}`}

                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words font-semibold">
                            {access.brand_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {access.role_name}
                          </p>
                        </div>

                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                  No active brand access is assigned to this account.
                </div>
              )}
            />
          </CardContent>
        </Card>

        <AvatarSettings
          profileId={profile.id}
          name={profile.full_name}
          email={profile.email}
          imageUrl={user.image ?? null}
        />


      </div>
    </DashboardShell>
  )
}
