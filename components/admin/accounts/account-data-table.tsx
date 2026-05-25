"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { toast } from "sonner"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

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
import { ScrollArea } from "@/components/ui/scroll-area"
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
import type { AccountListItem, BrandOption, RoleOption } from "@/lib/auth/accounts"
import { useAccountStore } from "@/stores/use-account-store"

type AccountDataTableProps = {
  accounts: AccountListItem[]
  brands: BrandOption[]
  roles: RoleOption[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function SortButton({
  label,
  column,
}: {
  label: string
  column: {
    toggleSorting: (desc?: boolean) => void
    getIsSorted: () => false | "asc" | "desc"
  }
}) {
  const direction = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(direction === "asc")}
    >
      {label}
      {direction ? (direction === "asc" ? " ↑" : " ↓") : null}
    </Button>
  )
}

function getAccountColumns(): ColumnDef<AccountListItem>[] {
  return [
    {
      accessorKey: "fullName",
      header: ({ column }) => <SortButton label="Full Name" column={column} />,
      cell: ({ row }) => (
        <div className="font-medium">{row.original.fullName}</div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortButton label="Email" column={column} />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "accountType",
      header: ({ column }) => (
        <SortButton label="Account Type" column={column} />
      ),
      cell: ({ row }) => (
        <AccountTypeBadge accountType={row.original.accountType} />
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortButton label="Status" column={column} />,
      cell: ({ row }) => <AccountStatusBadge status={row.original.status} />,
    },
    {
      id: "assignedBrands",
      header: "Assigned Brands",
      cell: ({ row }) => (
        <div className="flex min-w-48 max-w-xs flex-wrap gap-1">
          {row.original.brandAccess.length === 0 ? (
            <span className="text-xs text-muted-foreground">No brands</span>
          ) : (
            row.original.brandAccess.map((access) => (
              <Badge
                key={access.id}
                variant={access.isActive ? "secondary" : "neutral"}
              >
                {access.brandName}
                {access.isPrimary ? " / Primary" : ""}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      id: "rolesPerBrand",
      header: "Roles per Brand",
      cell: ({ row }) => (
        <div className="flex min-w-48 max-w-xs flex-wrap gap-1">
          {row.original.brandAccess.length === 0 ? (
            <span className="text-xs text-muted-foreground">No roles</span>
          ) : (
            row.original.brandAccess.map((access) => (
              <Badge key={access.id} variant="neutral">
                {access.brandName}: {access.roleName}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: ({ column }) => <SortButton label="Department" column={column} />,
      cell: ({ row }) => row.original.department ?? "Not set",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortButton label="Created Date" column={column} />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {dateFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <AccountStatusMenu account={row.original} />
        </div>
      ),
      enableSorting: false,
    },
  ]
}

export function AccountDataTable({
  accounts,
  brands,
  roles,
}: AccountDataTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
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
        account.accountType.toLowerCase().includes(query) ||
        (account.department ?? "").toLowerCase().includes(query)

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredAccounts,
    columns: getAccountColumns(),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

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
    <div className="min-w-0 space-y-6">
      <AccountPageHeader />

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Accounts</CardTitle>
            {isPending ? (
              <span className="text-xs text-muted-foreground">Updating...</span>
            ) : null}
          </div>

          <ScrollArea className="w-full pb-2" scrollbars="horizontal">
            <div className="flex w-max min-w-full items-center gap-2 pr-3  py-1">
              <div className="relative min-w-[260px] md:min-w-[320px]">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search accounts"
                  className="h-9 pl-9"
                />
              </div>

              <Select
                value={selectedAccountTypeFilter}
                onValueChange={setSelectedAccountTypeFilter}
              >
                <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
                <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
                <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
                <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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

              <Button
                variant="neutral"
                size="sm"
                className="h-9 whitespace-nowrap"
                onClick={resetAccountFilters}
              >
                Reset Filters
              </Button>
            </div>
          </ScrollArea>
        </CardHeader>

        <CardContent className="min-w-0 space-y-4">
          <div className="w-full min-w-0 rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="align-top">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="neutral"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="neutral"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
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
              variant="destructive"
              onClick={handleDisableAccount}
              disabled={isPending}
            >
              {isPending ? "Disabling..." : "Disable Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
