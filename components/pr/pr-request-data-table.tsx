"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Clock, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  duplicatePRRequest,
  updatePRRequestAction,
} from "@/app/employee/pr/actions";
import { PRStatusButtonGroup } from "@/components/pr/pr-status-button-group";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { PRDeleteRequestDialog } from "@/components/pr/pr-delete-request-dialog";
import {
  PRCollaborationStatusBadge,
  PRContactStatusBadge,
} from "@/components/pr/pr-status-badge";
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getPRCollaborationStatusLabel,
  getPRContactStatusLabel,
  getPRInfluencerSizeLabel,
  getPRRequestTypeLabel,
} from "@/lib/pr/pr-labels";
import {
  getPRCollaborationStatusButtonClassName,
  getPRContactStatusButtonClassName,
} from "@/lib/pr/pr-status-styles";
import {
  PR_COLLABORATION_STATUSES,
  PR_CONTACT_STATUSES,
  type PRCollaborationStatus,
} from "@/lib/pr/pr-constants";
import { buildPRUpdatePayload } from "@/lib/pr/pr-request-update";
import { isPRRequestActive, type PRRequestRecord } from "@/lib/pr/pr-types";

type PRRequestDataTableProps = {
  requests: PRRequestRecord[];
  canManage: boolean;
  canCreate: boolean;
  currentProfileId: number;
  readOnlyMode: boolean;
  onOpenDetails: (request: PRRequestRecord) => void;
  onEditRequest: (request: PRRequestRecord) => void;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getFollowUpPreview(request: PRRequestRecord) {
  const value =
    request.followUpNotes?.trim() || request.declinedReason?.trim() || "";

  return value || "—";
}

function CompactContactCell({
  request,
  disabled,
}: {
  request: PRRequestRecord;
  disabled: boolean;
}) {
  const router = useRouter();
  const [contactStatus, setContactStatus] = useState(request.contactStatus);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContactStatus(request.contactStatus);
  }, [request.contactStatus, request.id]);

  if (disabled) {
    return <PRContactStatusBadge status={request.contactStatus} />;
  }

  return (
    <PRStatusButtonGroup
      label=""
      compact
      value={contactStatus}
      options={PR_CONTACT_STATUSES.map((status) => ({
        value: status,
        label: getPRContactStatusLabel(status),
      }))}
      getOptionClassName={(status, isActive) =>
        getPRContactStatusButtonClassName(status, isActive)
      }
      disabled={isPending}
      onChange={(value) => {
        setContactStatus(value);
        startTransition(async () => {
          const result = await updatePRRequestAction(
            buildPRUpdatePayload(request, { contactStatus: value }),
          );

          if (!result.success) {
            toast.error(result.message);
            setContactStatus(request.contactStatus);
            return;
          }

          toast.success(result.message);
          router.refresh();
        });
      }}
    />
  );
}

function CompactCollabCell({
  request,
  disabled,
}: {
  request: PRRequestRecord;
  disabled: boolean;
}) {
  const router = useRouter();
  const [collaborationStatus, setCollaborationStatus] =
    useState<PRCollaborationStatus>(request.collaborationStatus);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCollaborationStatus(request.collaborationStatus);
  }, [request.collaborationStatus, request.id]);

  if (disabled) {
    return <PRCollaborationStatusBadge status={request.collaborationStatus} />;
  }

  if (request.contactStatus !== "CONTACTED") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <PRStatusButtonGroup
      label=""
      compact
      value={collaborationStatus}
      options={PR_COLLABORATION_STATUSES.map((status) => ({
        value: status,
        label: getPRCollaborationStatusLabel(status),
      }))}
      getOptionClassName={(status, isActive) =>
        getPRCollaborationStatusButtonClassName(status, isActive)
      }
      disabled={isPending}
      onChange={(value) => {
        setCollaborationStatus(value);
        startTransition(async () => {
          const result = await updatePRRequestAction(
            buildPRUpdatePayload(request, { collaborationStatus: value }),
          );

          if (!result.success) {
            toast.error(result.message);
            setCollaborationStatus(request.collaborationStatus);
            return;
          }

          toast.success(result.message);
          router.refresh();
        });
      }}
    />
  );
}

function RowActions({
  request,
  canManage,
  canCreate,
  currentProfileId,
  onEditRequest,
}: {
  request: PRRequestRecord;
  canManage: boolean;
  canCreate: boolean;
  currentProfileId: number;
  onEditRequest: (request: PRRequestRecord) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isActive = isPRRequestActive(request);
  const canEdit =
    isActive &&
    (canManage || (canCreate && request.createdByProfileId === currentProfileId));
  const canDelete =
    isActive && canCreate && request.createdByProfileId === currentProfileId;

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicatePRRequest({ requestId: request.id });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  }

  return (
    <>
      <div className="flex flex-nowrap items-center justify-end gap-1">
        {canCreate && isActive ? (
          <Button
            type="button"
            size="icon-sm"
            variant="neutral"
            disabled={isPending}
            title="Duplicate"
            onClick={handleDuplicate}
          >
            <Copy className="size-3.5" />
          </Button>
        ) : null}
        {canEdit ? (
          <Button
            type="button"
            size="icon-sm"
            variant="neutral"
            title="Edit"
            onClick={() => onEditRequest(request)}
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            disabled={isPending}
            title="Delete"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <PRDeleteRequestDialog
        request={request}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

function getColumns(options: {
  canManage: boolean;
  canCreate: boolean;
  currentProfileId: number;
  readOnlyMode: boolean;
  onOpenDetails: (request: PRRequestRecord) => void;
  onEditRequest: (request: PRRequestRecord) => void;
}): ColumnDef<PRRequestRecord>[] {
  const manageDisabled = options.readOnlyMode || !options.canManage;

  return [
    {
      accessorKey: "createdAt",
      header: "Date added",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {dateFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    {
      accessorKey: "brandName",
      header: "Branch",
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.brandName}</span>
      ),
    },
    {
      accessorKey: "requestType",
      header: "Type",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {getPRRequestTypeLabel(row.original.requestType)}
        </span>
      ),
    },
    {
      id: "influencerSize",
      header: "Size",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {getPRInfluencerSizeLabel(row.original.influencerSize)}
        </span>
      ),
    },
    {
      accessorKey: "recommendation",
      header: "Recommendation",
      cell: ({ row }) => (
        <p className="max-w-[200px] line-clamp-2 break-all text-xs">
          {row.original.recommendation}
        </p>
      ),
    },
    {
      accessorKey: "requestedByName",
      header: "Requested by",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {row.original.requestedByName}
        </span>
      ),
    },
    {
      id: "contactStatus",
      header: "Contact",
      cell: ({ row }) => (
        <CompactContactCell
          request={row.original}
          disabled={manageDisabled || !isPRRequestActive(row.original)}
        />
      ),
      enableSorting: false,
    },
    {
      id: "dateOfVisit",
      header: "Date of visit",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {row.original.dateOfVisit ?? "—"}
        </span>
      ),
    },
    {
      id: "collaborationStatus",
      header: "Collab",
      cell: ({ row }) => (
        <CompactCollabCell
          request={row.original}
          disabled={manageDisabled || !isPRRequestActive(row.original)}
        />
      ),
      enableSorting: false,
    },
    {
      id: "followUp",
      header: "Follow-up / reason",
      cell: ({ row }) => (
        <p className="max-w-[180px] line-clamp-2 text-xs">
          {getFollowUpPreview(row.original)}
        </p>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActions
          request={row.original}
          canManage={options.canManage}
          canCreate={options.canCreate}
          currentProfileId={options.currentProfileId}
          onEditRequest={options.onEditRequest}
        />
      ),
      enableSorting: false,
    },
  ];
}

export function PRRequestDataTable({
  requests,
  canManage,
  canCreate,
  currentProfileId,
  readOnlyMode,
  onOpenDetails,
  onEditRequest,
}: PRRequestDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = useMemo(
    () =>
      getColumns({
        canManage,
        canCreate,
        currentProfileId,
        readOnlyMode,
        onOpenDetails,
        onEditRequest,
      }),
    [canCreate, canManage, currentProfileId, onEditRequest, onOpenDetails, readOnlyMode],
  );

  const table = useReactTable({
    data: requests,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No PR requests match your filters.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <DataTableScrollArea fill>
        <Table className="min-w-[1200px] border-0">
          <TableHeader className={DATA_TABLE_HEADER_CLASS}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={DATA_TABLE_BODY_CLASS}>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onOpenDetails(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="align-middle py-2"
                    onClick={
                      cell.column.id === "actions" ||
                        cell.column.id === "contactStatus" ||
                        cell.column.id === "collaborationStatus"
                        ? (event) => event.stopPropagation()
                        : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableScrollArea>

      <DataTablePagination
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
      />
    </div>
  );
}
