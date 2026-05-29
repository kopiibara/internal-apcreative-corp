import type {
  ContentType,
  Platform,
  PublishStatus,
  ReviewStatus,
} from "@/app/employee/approvals/schema";
import type {
  TaskAssignmentStatus,
  TaskPriority,
  TaskType,
} from "@/lib/tasks/task-type";

export type DailyReportBrandOption = {
  id: number;
  name: string;
};

export type DailyReportEmployeeOption = {
  id: number;
  fullName: string;
  email: string;
};

export type DailyReportSummary = {
  dailyCompletionRate: number;
  gradedTaskCompletionRate: number;
  grossTaskPoints: number;
  lateTaskDeductionPoints: number;
  gradedTaskPoints: number;
  adjustedCompletionRate: number;
  approvalRate: number;
  approvedCount: number;
  approvalTotal: number;
  completedGradedTasks: number;
  totalGradedTasks: number;
  pendingMissingCount: number;
  blockerCount: number;
};

export type DailyBrandSummary = {
  brandId: number;
  brandName: string;
  gradedTotal: number;
  gradedDone: number;
  pendingTasks: number;
  blockerTasks: number;
  approvalsSubmitted: number;
  fullyApproved: number;
  approvalRate: number;
  completionRate: number;
};

export type DailyEmployeeSummary = {
  profileId: number;
  fullName: string;
  email: string;
  imageUrl: string | null;
  assignedGradedTasks: number;
  doneGradedTasks: number;
  pendingTasks: number;
  blockerTasks: number;
  revisionTasks: number;
  approvalsSubmitted: number;
  approvalsApproved: number;
  gradedCompletionRate: number;
  grossTaskPoints: number;
  lateTaskDeductionPoints: number;
  taskPoints: number;
  adjustedCompletionRate: number;
};

export type DailyTaskLogEntry = {
  assignmentId: number;
  taskId: number;
  title: string;
  assigneeName: string;
  createdByName: string;
  brandName: string | null;
  taskType: TaskType;
  priority: TaskPriority | null;
  status: TaskAssignmentStatus;
  dueDate: string | null;
  completedAt: string | null;
  proofStatus: string;
  updatedAt: string;
  isOverdue: boolean;
  isMissingProof: boolean;
};

export type DailyApprovalLogEntry = {
  id: number;
  dateSubmitted: string;
  submittedByName: string;
  brandName: string | null;
  contentType: ContentType;
  platform: Platform;
  captionPreview: string;
  supervisorStatus: ReviewStatus;
  directorStatus: ReviewStatus;
  publishStatus: PublishStatus;
  scheduledPublishedDate: string | null;
};

export type DailyBlockerEntry = {
  assignmentId: number;
  taskTitle: string;
  blockerNote: string | null;
  employeeName: string;
  brandName: string | null;
  reportedAt: string | null;
  createdByName: string;
  dueDate: string | null;
};

export type DailyMissingEntry = {
  kind: "graded_due" | "overdue_assigned" | "revision" | "approval_pending";
  label: string;
  employeeName: string | null;
  brandName: string | null;
  reference: string;
};

export type DailyTimelineEntry = {
  id: string;
  createdAt: string;
  actorName: string;
  actionLabel: string;
  module: "Task" | "Approval";
  brandName: string | null;
  employeeName: string | null;
  detail: string | null;
};

export type DailyReportData = {
  summary: DailyReportSummary;
  brandSummaries: DailyBrandSummary[];
  employeeSummaries: DailyEmployeeSummary[];
  taskLog: DailyTaskLogEntry[];
  approvalLog: DailyApprovalLogEntry[];
  blockers: DailyBlockerEntry[];
  missingItems: DailyMissingEntry[];
  timeline: DailyTimelineEntry[];
  alertSummary: string;
};
