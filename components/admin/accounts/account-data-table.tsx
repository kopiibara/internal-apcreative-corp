"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LayoutGrid, List, Plus, Search } from "lucide-react"
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
import { AccountDetailsSheet } from "@/components/admin/accounts/account-details-sheet"
import { AccountStatusMenu } from "@/components/admin/accounts/account-status-menu"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area"
import { ForcePasswordDialog } from "@/components/admin/accounts/force-password-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { SoftDeleteAccountDialog } from "@/components/admin/accounts/soft-delete-account-dialog"
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

type AccountViewMode = "table" | "cards"

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
        <div className="flex items-center gap-3">
          <UserAvatar
            profileId={row.original.id}
            name={row.original.fullName}
            email={row.original.email}
            imageUrl={row.original.imageUrl}
            size="lg"
          />
          <div className="min-w-0 font-medium">{row.original.fullName}</div>
        </div>
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

function AccountBadgeList({
  account,
  mode,
}: {
  account: AccountListItem
  mode: "brands" | "roles"
}) {
  if (account.brandAccess.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {mode === "brands" ? "No brands" : "No roles"}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {account.brandAccess.map((access) => (
        <Badge
          key={`${mode}-${access.id}`}
          variant={
            mode === "brands"
              ? access.isActive
                ? "secondary"
                : "neutral"
              : "neutral"
          }
          className="max-w-full"
        >
          {mode === "brands"
            ? `${access.brandName}${access.isPrimary ? " / Primary" : ""}`
            : `${access.brandName}: ${access.roleName}`}
        </Badge>
      ))}
    </div>
  )
}

function AccountInfoField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  )
}

function AccountProfileCard({
  account,
  onOpenDetails,
}: {
  account: AccountListItem
  onOpenDetails: (account: AccountListItem) => void
}) {
  return (
    <Card
      className="cursor-pointer rounded-lg border-2 border-border bg-background p-0 transition-colors hover:bg-muted/40"
      onClick={() => onOpenDetails(account)}
    >
      <CardContent className="flex h-full min-w-0 flex-col gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar
            profileId={account.id}
            name={account.fullName}
            email={account.email}
            imageUrl={account.imageUrl}
            size="lg"
            className="size-14"
          />
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-bold leading-snug">
              {account.fullName}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {account.email}
            </p>
          </div>
          <div onClick={(event) => event.stopPropagation()}>
            <AccountStatusMenu account={account} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <AccountTypeBadge accountType={account.accountType} />
          <AccountStatusBadge status={account.status} />
        </div>



        <AccountInfoField label="Assigned Brands">
          <AccountBadgeList account={account} mode="brands" />
        </AccountInfoField>

        <AccountInfoField label="Roles Per Brand">
          <AccountBadgeList account={account} mode="roles" />
        </AccountInfoField>
      </CardContent>
    </Card>
  )
}

export function AccountDataTable({
  accounts,
  brands,
  roles,
}: AccountDataTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [viewMode, setViewMode] = useState<AccountViewMode>("table")
  const [isPending, startTransition] = useTransition()
  const {
    selectedAccount,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDisableDialogOpen,
    isDetailsSheetOpen,
    isForcePasswordDialogOpen,
    isSoftDeleteDialogOpen,
    searchQuery,
    selectedRoleFilter,
    selectedBrandFilter,
    selectedStatusFilter,
    selectedAccountTypeFilter,
    closeCreateDialog,
    closeEditDialog,
    closeDisableDialog,
    openCreateDialog,
    openDetailsSheet,
    closeDetailsSheet,
    openEditDialog,
    openForcePasswordDialog,
    closeForcePasswordDialog,
    openSoftDeleteDialog,
    closeSoftDeleteDialog,
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
        selectedStatusFilter === "all"
          ? account.status !== "DELETED"
          :
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
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="gap-3">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Accounts</CardTitle>
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {isPending ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Updating...
                </span>
              ) : null}
              <div className="flex">
                <Button
                  type="button"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon-sm"
                  aria-label="Show table view"
                  title="Table view"
                  onClick={() => setViewMode("table")}
                >
                  <List className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="icon-sm"
                  aria-label="Show card view"
                  title="Card view"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="size-4" />
                Create Account
              </Button>
            </div>
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

        <CardContent className="min-h-0 min-w-0 space-y-4">
          {viewMode === "table" ? (
            <DataTableScrollArea>
              <Table className="min-w-[1600px] border-0">
                <TableHeader className={DATA_TABLE_HEADER_CLASS}>
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
                <TableBody className={DATA_TABLE_BODY_CLASS}>
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
                      <TableRow
                        key={row.id}
                        className="cursor-pointer "
                        onClick={() => openDetailsSheet(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="align-top"
                            onClick={
                              cell.column.id === "actions"
                                ? (event) => event.stopPropagation()
                                : undefined
                            }
                          >
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
            </DataTableScrollArea>
          ) : (
            <ScrollArea
              className="h-[calc(100vh-24rem)] min-h-[320px] max-h-[620px] w-full rounded-lg border-2 border-border bg-card"
              scrollbars="vertical"
              viewportClassName="rounded-lg"
            >
              {table.getRowModel().rows.length === 0 ? (
                <div className="flex min-h-[280px] items-center justify-center p-4 text-sm text-muted-foreground">
                  No accounts found.
                </div>
              ) : (
                <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {table.getRowModel().rows.map((row) => (
                    <AccountProfileCard
                      key={row.id}
                      account={row.original}
                      onOpenDetails={openDetailsSheet}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          <DataTablePagination
            pageIndex={table.getState().pagination.pageIndex}
            pageCount={table.getPageCount()}
            canPreviousPage={table.getCanPreviousPage()}
            canNextPage={table.getCanNextPage()}
            onPreviousPage={() => table.previousPage()}
            onNextPage={() => table.nextPage()}
          />
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

      <AccountDetailsSheet
        account={selectedAccount}
        open={isDetailsSheetOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDetailsSheet()
          }
        }}
        onEdit={(account) => {
          closeDetailsSheet()
          openEditDialog(account)
        }}
        onForcePassword={(account) => {
          closeDetailsSheet()
          openForcePasswordDialog(account)
        }}
        onSoftDelete={(account) => {
          closeDetailsSheet()
          openSoftDeleteDialog(account)
        }}
      />

      <ForcePasswordDialog
        account={selectedAccount}
        open={isForcePasswordDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeForcePasswordDialog()
          }
        }}
      />

      <SoftDeleteAccountDialog
        account={selectedAccount}
        open={isSoftDeleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeSoftDeleteDialog()
          }
        }}
      />

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
              This will immediately log the user out and prevent them from accessing the system until their account is re-enabled.
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
