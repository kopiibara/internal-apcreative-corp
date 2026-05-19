"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  FilePenLine,
  MoreHorizontal,
  Search,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import {
  updateDirectorReview,
  updatePublishingInfo,
  updateSupervisorReview,
} from "@/app/admin/approvals/actions"
import {
  contentTypes,
  publishStatuses,
  reviewStatuses,
} from "@/app/employee/approvals/schema"
import { ApprovalNotesCell } from "@/components/admin/approvals/approval-notes-cell"
import { ApprovalStatusSelect } from "@/components/admin/approvals/approval-status-select"
import { PublishStatusSelect } from "@/components/admin/approvals/publish-status-select"
import { ScheduledDatePicker } from "@/components/admin/approvals/scheduled-date-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Textarea } from "@/components/ui/textarea"
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report"
import { useApprovalStore } from "@/stores/use-approval-store"

type ApprovalTableProps = {
  reports: ContentReport[]
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={status === "Approved" ? "default" : "outline"}>{status}</Badge>
}

function getDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not scheduled"
}

function toDateTimeLocal(value: string | null) {
  return value ? value.slice(0, 16) : ""
}

function SupervisorReviewDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ContentReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [status, setStatus] = useState(report.supervisorStatus)
  const [notes, setNotes] = useState(report.supervisorNotes ?? "")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await updateSupervisorReview({
        reportId: report.id,
        supervisorStatus: status,
        supervisorNotes: notes,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Marketing Supervisor Review</DialogTitle>
          <DialogDescription>
            Update supervisor status and notes for this submission.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <ApprovalStatusSelect
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor-notes">Notes</Label>
            <Textarea
              id="supervisor-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DirectorReviewDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ContentReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [status, setStatus] = useState(report.directorStatus)
  const [notes, setNotes] = useState(report.directorNotes ?? "")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await updateDirectorReview({
        reportId: report.id,
        directorStatus: status,
        directorNotes: notes,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Director of Marketing Review</DialogTitle>
          <DialogDescription>
            Update director status and notes for this submission.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <ApprovalStatusSelect
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="director-notes">Notes</Label>
            <Textarea
              id="director-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PublishingDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ContentReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const canEdit = canEditPublishingFields(report)
  const [publishStatus, setPublishStatus] = useState(report.publishStatus)
  const [scheduledDate, setScheduledDate] = useState(
    toDateTimeLocal(report.scheduledPublishedDate)
  )
  const [remarks, setRemarks] = useState(report.remarksRevisionSummary ?? "")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await updatePublishingInfo({
        reportId: report.id,
        publishStatus,
        scheduledPublishedDate: scheduledDate,
        remarksRevisionSummary: remarks,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Publishing Details</DialogTitle>
          <DialogDescription>
            Publishing fields unlock after supervisor and director approvals.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Publish Status</Label>
            <PublishStatusSelect
              value={publishStatus}
              onValueChange={(value) =>
                setPublishStatus(value as typeof publishStatus)
              }
              disabled={isPending || !canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Scheduled / Published Date</Label>
            <ScheduledDatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              disabled={isPending || !canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishing-remarks">Remarks / Revision Summary</Label>
            <Textarea
              id="publishing-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !canEdit}>
              {isPending ? "Saving..." : "Save Publishing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ApprovalTable({
  reports,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
}: ApprovalTableProps) {
  const {
    selectedApproval,
    searchQuery,
    selectedContentTypeFilter,
    selectedSupervisorStatusFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    isSupervisorReviewDialogOpen,
    isDirectorReviewDialogOpen,
    isPublishingDialogOpen,
    openSupervisorReviewDialog,
    closeSupervisorReviewDialog,
    openDirectorReviewDialog,
    closeDirectorReviewDialog,
    openPublishingDialog,
    closePublishingDialog,
    setSearchQuery,
    setSelectedContentTypeFilter,
    setSelectedSupervisorStatusFilter,
    setSelectedDirectorStatusFilter,
    setSelectedPublishStatusFilter,
    resetApprovalFilters,
  } = useApprovalStore()

  const filteredReports = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        report.submittedByName.toLowerCase().includes(normalizedQuery) ||
        report.caption.toLowerCase().includes(normalizedQuery) ||
        report.contentType.toLowerCase().includes(normalizedQuery)

      return (
        matchesSearch &&
        (selectedContentTypeFilter === "all" ||
          report.contentType === selectedContentTypeFilter) &&
        (selectedSupervisorStatusFilter === "all" ||
          report.supervisorStatus === selectedSupervisorStatusFilter) &&
        (selectedDirectorStatusFilter === "all" ||
          report.directorStatus === selectedDirectorStatusFilter) &&
        (selectedPublishStatusFilter === "all" ||
          report.publishStatus === selectedPublishStatusFilter)
      )
    })
  }, [
    reports,
    searchQuery,
    selectedContentTypeFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    selectedSupervisorStatusFilter,
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review content submissions and update publishing once both approvals
          are complete.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Content approval sheet</CardTitle>
            <Button variant="outline" size="sm" onClick={resetApprovalFilters}>
              Reset Filters
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search approvals"
                className="pl-9"
              />
            </div>

            <Select
              value={selectedContentTypeFilter}
              onValueChange={setSelectedContentTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All content types</SelectItem>
                {contentTypes.map((contentType) => (
                  <SelectItem key={contentType} value={contentType}>
                    {contentType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSupervisorStatusFilter}
              onValueChange={setSelectedSupervisorStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Supervisor status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisor statuses</SelectItem>
                {reviewStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDirectorStatusFilter}
              onValueChange={setSelectedDirectorStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Director status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All director statuses</SelectItem>
                {reviewStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedPublishStatusFilter}
              onValueChange={setSelectedPublishStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Publish status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All publish statuses</SelectItem>
                {publishStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
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
                <TableHead>Date Submitted</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>Content Inspo</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Asset Link</TableHead>
                <TableHead>Marketing Supervisor </TableHead>
                <TableHead>Marketing Supervisor Notes</TableHead>
                <TableHead>Marketing Director </TableHead>
                <TableHead>Director Notes</TableHead>
                <TableHead>Publish Status</TableHead>
                <TableHead>Scheduled / Published Date</TableHead>
                <TableHead>Remarks / Revision Summary</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">
                    No approvals found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const canPublishReport =
                    canPublishUpdate && canEditPublishingFields(report)

                  return (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap">
                        {dateFormatter.format(new Date(report.dateSubmitted))}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {report.submittedByName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {report.brandName ?? "No brand"}
                        </div>
                      </TableCell>
                      <TableCell>{report.contentType}</TableCell>
                      <TableCell className="max-w-xs">
                        {report.contentInspo ?? "None"}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="line-clamp-2">{report.caption}</div>
                      </TableCell>
                      <TableCell>
                        {report.assetLink ? (
                          <a
                            href={report.assetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm underline-offset-4 hover:underline"
                          >
                            Open asset
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No link
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.supervisorStatus} />
                      </TableCell>
                      <TableCell>
                        <ApprovalNotesCell notes={report.supervisorNotes} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.directorStatus} />
                      </TableCell>
                      <TableCell>
                        <ApprovalNotesCell notes={report.directorNotes} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.publishStatus} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {getDateLabel(report.scheduledPublishedDate)}
                      </TableCell>
                      <TableCell>
                        <ApprovalNotesCell
                          notes={report.remarksRevisionSummary}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Open approval actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openSupervisorReviewDialog(report)}
                              disabled={!canSupervisorReview}
                            >
                              <ShieldCheck className="size-4" />
                              Supervisor review
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDirectorReviewDialog(report)}
                              disabled={!canDirectorReview}
                            >
                              <FilePenLine className="size-4" />
                              Director review
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openPublishingDialog(report)}
                              disabled={!canPublishReport}
                            >
                              <CalendarClock className="size-4" />
                              Publishing details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isSupervisorReviewDialogOpen && selectedApproval ? (
        <SupervisorReviewDialog
          key={`supervisor-${selectedApproval.id}`}
          report={selectedApproval}
          open={isSupervisorReviewDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeSupervisorReviewDialog()
            }
          }}
        />
      ) : null}

      {isDirectorReviewDialogOpen && selectedApproval ? (
        <DirectorReviewDialog
          key={`director-${selectedApproval.id}`}
          report={selectedApproval}
          open={isDirectorReviewDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeDirectorReviewDialog()
            }
          }}
        />
      ) : null}

      {isPublishingDialogOpen && selectedApproval ? (
        <PublishingDialog
          key={`publishing-${selectedApproval.id}`}
          report={selectedApproval}
          open={isPublishingDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closePublishingDialog()
            }
          }}
        />
      ) : null}
    </div>
  )
}
