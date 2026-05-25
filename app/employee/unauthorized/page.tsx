import { UnauthorizedState } from "@/components/shared/unauthorized-state"
import { requireEmployee } from "@/lib/auth/auth-session"

type EmployeeUnauthorizedPageProps = {
  searchParams: Promise<{
    permission?: string
  }>
}

export default async function EmployeeUnauthorizedPage({
  searchParams,
}: EmployeeUnauthorizedPageProps) {
  await requireEmployee()
  const { permission } = await searchParams

  return (
    <UnauthorizedState
      permissionKey={permission}
      homeHref="/employee"
      homeLabel="Back to My Brand Dashboard"
    />
  )
}
