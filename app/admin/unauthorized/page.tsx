import { UnauthorizedState } from "@/components/shared/unauthorized-state"
import { requireAdmin } from "@/lib/auth/auth-session"

type AdminUnauthorizedPageProps = {
  searchParams: Promise<{
    permission?: string
  }>
}

export default async function AdminUnauthorizedPage({
  searchParams,
}: AdminUnauthorizedPageProps) {
  await requireAdmin()
  const { permission } = await searchParams

  return (
    <UnauthorizedState
      permissionKey={permission}
      homeHref="/admin"
      homeLabel="Back to Executive Dashboard"
    />
  )
}
