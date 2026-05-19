"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { disableAccount } from "@/app/admin/account-control/actions"
import {
  accountTypes,
  profileStatuses,
} from "@/app/admin/account-control/schema"
import { AccountFormDialog } from "@/components/admin/accounts/account-form-dialog"
import { AccountPageHeader } from "@/components/admin/accounts/account-page-header"
import { AccountStatusMenu } from "@/components/admin/accounts/account-status-menu"
import {
  AccountStatusBadge,
  AccountTypeBadge,
} from "@/components/admin/accounts/account-status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AccountListItem, BrandOption, RoleOption } from "@/lib/accounts"
import { useAccountStore } from "@/stores/use-account-store"

type AccountTableProps = {
  accounts: AccountListItem[]
  brands: BrandOption[]
  roles: RoleOption[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function AccountTable({ accounts, brands, roles }: AccountTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    selectedAccount,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDisableDialogOpen,
    searchQuery,
    selectedRoleFilter,
    selectedBrandFilter,
    selectedStatusFilter,
    selectedAccountTypeFilter,
    closeCreateDialog,
    closeEditDialog,
    closeDisableDialog,
    setSearchQuery,
    setSelectedRoleFilter,
    setSelectedBrandFilter,
    setSelectedStatusFilter,
    setSelectedAccountTypeFilter,
    resetAccountFilters,
  } = useAccountStore()

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return accounts.filter((account) => {
      const matchesSearch =
        query.length === 0 ||
        account.fullName.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.accountType.toLowerCase().includes(query)

      const matchesStatus =
        selectedStatusFilter === "all" ||
        account.status === selectedStatusFilter

      const matchesAccountType =
        selectedAccountTypeFilter === "all" ||
        account.accountType === selectedAccountTypeFilter

      const matchesBrand =
        selectedBrandFilter === "all" ||
        account.brandAccess.some(
          (access) => String(access.brandId) === selectedBrandFilter
        )

      const matchesRole =
        selectedRoleFilter === "all" ||
        account.brandAccess.some(
          (access) => String(access.roleId) === selectedRoleFilter
        )

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAccountType &&
        matchesBrand &&
        matchesRole
      )
    })
  }, [
    accounts,
    searchQuery,
    selectedAccountTypeFilter,
    selectedBrandFilter,
    selectedRoleFilter,
    selectedStatusFilter,
  ])

  function handleDisableAccount() {
    if (!selectedAccount) {
      return
    }

    startTransition(async () => {
      const result = await disableAccount({ profileId: selectedAccount.id })

      if (result.success) {
        toast.success(result.message)
        closeDisableDialog()
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <div className="space-y-6">
      <AccountPageHeader />

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Accounts</CardTitle>
            <Button variant="outline" size="sm" onClick={resetAccountFilters}>
              Reset Filters
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search accounts"
                className="pl-9"
              />
            </div>

            <Select
              value={selectedAccountTypeFilter}
              onValueChange={setSelectedAccountTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All account types</SelectItem>
                {accountTypes.map((accountType) => (
                  <SelectItem key={accountType} value={accountType}>
                    {accountType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatusFilter}
              onValueChange={setSelectedStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {profileStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedBrandFilter}
              onValueChange={setSelectedBrandFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedRoleFilter}
              onValueChange={setSelectedRoleFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium">{account.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {account.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AccountTypeBadge accountType={account.accountType} />
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={account.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {account.brandAccess.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No brands
                          </span>
                        ) : (
                          account.brandAccess.map((access) => (
                            <Badge
                              key={access.id}
                              variant={access.isActive ? "secondary" : "outline"}
                            >
                              {access.brandName}
                              {access.isPrimary ? " / Primary" : ""}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {account.brandAccess.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No roles
                          </span>
                        ) : (
                          account.brandAccess.map((access) => (
                            <Badge key={access.id} variant="outline">
                              {access.roleName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dateFormatter.format(new Date(account.createdAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <AccountStatusMenu account={account} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isCreateDialogOpen ? (
        <AccountFormDialog
          mode="create"
          open={isCreateDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeCreateDialog()
            }
          }}
          brands={brands}
          roles={roles}
        />
      ) : null}

      {isEditDialogOpen ? (
        <AccountFormDialog
          key={selectedAccount?.id ?? "edit-account"}
          mode="edit"
          open={isEditDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeEditDialog()
            }
          }}
          account={selectedAccount}
          brands={brands}
          roles={roles}
        />
      ) : null}

      <AlertDialog
        open={isDisableDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDisableDialog()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable account?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets the profile status to DISABLED and revokes active
              Better Auth sessions when available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableAccount}
              disabled={isPending}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {isPending ? "Disabling..." : "Disable Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
