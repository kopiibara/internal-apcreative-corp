"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";

import {
  changeTaskAssignmentStatusSchema,
  confirmTaskBlockerSchema,
  confirmTaskDoneSchema,
  createTaskSchema,
  deleteTaskSchema,
  reportTaskBlockerSchema,
  requestTaskRevisionSchema,
  submitTaskProofSchema,
  updateTaskSchema,
} from "@/app/admin/to-do/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import {
  isAdminAccountType,
  isEmployeeAccountType,
} from "@/lib/auth/account-type";
import { can } from "@/lib/permissions";
import { query, transaction } from "@/lib/db";
import { assertSupervisorCanAssignTasksToUsers } from "@/lib/approvals/approval-permissions";
import { rejectIfRateLimited } from "@/lib/security/rate-limit-guards";
import { normalizeRichTextForStorage } from "@/lib/rich-text/rich-text";
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from "@/lib/security/sanitize-text";
import {
  assertBrandOfficerCanAssignToProfiles,
  profileHasBrandOfficerRole,
} from "@/lib/tasks/brand-officer-task-assign";
import { getGradedTaskReviewBlockReason } from "@/lib/tasks/task-review-guards";
import {
  canAssignGradedTasks,
  canReviewTaskAssignments,
  determineTaskType,
  isPersonalTaskType,
} from "@/lib/tasks/task-type";
import type { TaskAssignmentStatus } from "@/lib/tasks/task-statuses";
import { TASK_REVALIDATE_PATHS } from "@/lib/dashboard/dashboard-revalidate-paths";
import {
  getTaskAssignmentById,
  getTaskAssignmentsForEmployee,
  getTaskAssignmentsForViewer,
  type TaskAssignmentRecord,
} from "@/lib/tasks/tasks";
const ADMIN_TRANSITIONS: Record<TaskAssignmentStatus, TaskAssignmentStatus[]> =
  {
    ASSIGNED: ["BLOCKER", "PENDING"],
    BLOCKER: ["ASSIGNED", "PENDING"],
    PENDING: ["DONE", "REVISION"],
    REVISION: ["ASSIGNED", "BLOCKER"],
    DONE: ["ASSIGNED", "BLOCKER", "PENDING", "REVISION"],
  };

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type TaskAssignmentUpdateData = {
  updatedAssignment: TaskAssignmentRecord;
};

type TaskBoardLiveData = {
  assignments: TaskAssignmentRecord[];
};

const FULL_STACK_DEVELOPER_RESTRICTED_TASK_PERMISSIONS = new Set([
  "tasks.create",
  "tasks.assign",
  "tasks.update",
  "tasks.delete",
  "tasks.review",
  "tasks.manage_all",
]);

async function authorizeTaskAction(permissionKeys: string[]) {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
      } satisfies ActionResult,
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "Your account is not active.",
      } satisfies ActionResult,
    };
  }

  if (
    context.profile.account_type === "FULL_STACK_DEVELOPER" &&
    permissionKeys.some((permissionKey) =>
      FULL_STACK_DEVELOPER_RESTRICTED_TASK_PERMISSIONS.has(permissionKey),
    )
  ) {
    return {
      error: {
        success: false,
        message:
          "Full Stack Developer accounts can only submit proof for assigned tasks.",
      } satisfies ActionResult,
    };
  }

  const allowedChecks = await Promise.all(
    permissionKeys.map((permissionKey) =>
      can(context.profile.auth_user_id, permissionKey),
    ),
  );

  if (!allowedChecks.some(Boolean)) {
    return {
      error: {
        success: false,
        message: "You do not have permission to perform this action.",
      } satisfies ActionResult,
    };
  }

  return { context };
}

function revalidateTaskRoutes() {
  for (const route of TASK_REVALIDATE_PATHS) {
    revalidatePath(route);
  }
}

export async function getLiveTaskAssignments(): Promise<
  ActionResult<TaskBoardLiveData>
> {
  const authorization = await authorizeTaskAction(["tasks.view"]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await rejectIfRateLimited({
    bucket: "task:live-sync",
    limit: 180,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitError) {
    return {
      success: false,
      message: rateLimitError.message,
    };
  }

  const { context } = authorization;
  const assignments = isEmployeeAccountType(context.profile.account_type)
    ? await getTaskAssignmentsForEmployee(context.profile.id)
    : await getTaskAssignmentsForViewer({
        profileId: context.profile.id,
        canViewAll: await can(context.profile.auth_user_id, "tasks.view_all"),
      });

  return {
    success: true,
    message: "Task board synced.",
    data: { assignments },
  };
}

async function buildTaskAssignmentUpdateResult(
  assignmentId: number,
  message: string,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  revalidateTaskRoutes();
  const updatedAssignment = await getTaskAssignmentById(assignmentId);

  if (!updatedAssignment) {
    return {
      success: false,
      message: "Task assignment was not found after update.",
    };
  }

  return {
    success: true,
    message,
    data: { updatedAssignment },
  };
}

function parseDueDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Due date is invalid.");
  }

  return date.toISOString();
}

function normalizeSubmitTaskProofInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const record = input as Record<string, unknown>;
  const normalizeText = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  return {
    ...record,
    proofUrl: normalizeText(record.proofUrl),
    proofNote: normalizeText(record.proofNote),
  };
}

async function guardTaskMutationRateLimit(
  bucket: string,
): Promise<{ success: false; message: string } | null> {
  return rejectIfRateLimited({
    bucket,
    limit: 60,
    windowMs: 60_000,
  });
}

async function insertTaskActivityLog(
  client: PoolClient,
  input: {
    taskId: number;
    assignmentId?: number | null;
    actorProfileId: number;
    action: string;
    fromStatus?: TaskAssignmentStatus | null;
    toStatus?: TaskAssignmentStatus | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  await client.query(
    `
    INSERT INTO task_activity_log (
      task_id,
      task_assignment_id,
      actor_profile_id,
      action,
      from_status,
      to_status,
      notes,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      input.taskId,
      input.assignmentId ?? null,
      input.actorProfileId,
      input.action,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.notes ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

function canAdminManageAssignment({
  canManageAll,
  creatorProfileId,
  actorProfileId,
}: {
  canManageAll: boolean;
  creatorProfileId: number;
  actorProfileId: number;
}) {
  return canManageAll || creatorProfileId === actorProfileId;
}

function assertAdminTransitionAllowed(
  fromStatus: TaskAssignmentStatus,
  toStatus: TaskAssignmentStatus,
) {
  return ADMIN_TRANSITIONS[fromStatus]?.includes(toStatus) === true;
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const authorization = await authorizeTaskAction([
    "tasks.create",
    "tasks.assign",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const parsed = createTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid task details.",
    };
  }

  const { context } = authorization;
  const uniqueAssignees = [...new Set(parsed.data.assignedToProfileIds)];

  const isBrandOfficer = await profileHasBrandOfficerRole(context.profile.id);
  const canAssignTeamTasks =
    isBrandOfficer &&
    (await can(context.profile.auth_user_id, "tasks.assign"));

  if (isEmployeeAccountType(context.profile.account_type)) {
    const isPersonalSelfTask =
      uniqueAssignees.length === 1 && uniqueAssignees[0] === context.profile.id;

    if (!canAssignTeamTasks) {
      return {
        success: false,
        message: isPersonalSelfTask
          ? "Use Reminders for personal follow-ups. You cannot create To-Do tasks."
          : "You do not have permission to assign team tasks.",
      };
    }

    if (isPersonalSelfTask) {
      return {
        success: false,
        message: "Use Reminders for personal follow-ups.",
      };
    }

    const assigneeCheck = await assertBrandOfficerCanAssignToProfiles(
      context.profile.id,
      uniqueAssignees,
    );

    if (!assigneeCheck.ok) {
      return {
        success: false,
        message: assigneeCheck.message,
      };
    }
  }

  const supervisorAssigneeCheck = await assertSupervisorCanAssignTasksToUsers(
    context.profile,
    uniqueAssignees,
  );

  if (!supervisorAssigneeCheck.ok) {
    return {
      success: false,
      message: supervisorAssigneeCheck.message,
    };
  }

  const taskType = determineTaskType({
    creatorAccountType: context.profile.account_type,
    creatorProfileId: context.profile.id,
    assignedToProfileIds: uniqueAssignees,
    canAssignTeamTasks,
  });

  if (taskType === "GRADED") {
    const canAssign = await can(context.profile.auth_user_id, "tasks.assign");

    if (
      !canAssign ||
      (!canAssignGradedTasks(context.profile.account_type) && !canAssignTeamTasks)
    ) {
      return {
        success: false,
        message: "You do not have permission to assign graded tasks.",
      };
    }

    if (!parsed.data.dueDate) {
      return {
        success: false,
        message: "Due date is required for graded tasks.",
      };
    }
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:create");

  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    const dueDate = parseDueDate(parsed.data.dueDate);
    const normalizedDescription = parsed.data.description
      ? normalizeRichTextForStorage(parsed.data.description)
      : null;

    await transaction(async (client) => {
      const taskResult = await client.query<{ id: number }>(
        `
        INSERT INTO task (
          title,
          description,
          task_type,
          priority,
          created_by_profile_id,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          sanitizeRequiredText(parsed.data.title, 200),
          sanitizeOptionalText(normalizedDescription, 8000),
          taskType,
          parsed.data.priority ?? null,
          context.profile.id,
          dueDate,
        ],
      );

      const taskId = taskResult.rows[0]?.id;

      if (!taskId) {
        throw new Error("Task could not be created.");
      }

      for (const assigneeId of uniqueAssignees) {
        const assignmentResult = await client.query<{ id: number }>(
          `
          INSERT INTO task_assignment (
            task_id,
            assigned_to_profile_id,
            status
          )
          VALUES ($1, $2, 'ASSIGNED')
          RETURNING id
          `,
          [taskId, assigneeId],
        );

        const assignmentId = assignmentResult.rows[0]?.id;

        if (assignmentId) {
          await insertTaskActivityLog(client, {
            taskId,
            assignmentId,
            actorProfileId: context.profile.id,
            action: "ASSIGNMENT_CREATED",
            toStatus: "ASSIGNED",
            notes: "Task assignment created.",
          });
        }
      }

      await insertTaskActivityLog(client, {
        taskId,
        actorProfileId: context.profile.id,
        action: "TASK_CREATED",
        notes: parsed.data.title,
      });
    });

    revalidateTaskRoutes();

    return {
      success: true,
      message:
        taskType === "GRADED"
          ? "Graded task assigned successfully."
          : "Personal task created successfully.",
    };
  } catch (error) {
    console.error("createTask failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updateTask(input: unknown): Promise<ActionResult> {
  const authorization = await authorizeTaskAction([
    "tasks.update",
    "tasks.manage_all",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:update");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = updateTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid task update.",
    };
  }

  const existingAssignments = await query<{ created_by_profile_id: number }>(
    `
    SELECT created_by_profile_id
    FROM task
    WHERE id = $1
    LIMIT 1
    `,
    [parsed.data.taskId],
  );

  const parentTask = existingAssignments.rows[0];

  if (!parentTask) {
    return { success: false, message: "Task was not found." };
  }

  const { context } = authorization;
  const canManageAll = await can(
    context.profile.auth_user_id,
    "tasks.manage_all",
  );

  if (
    !canManageAll &&
    parentTask.created_by_profile_id !== context.profile.id
  ) {
    return {
      success: false,
      message: "You do not have permission to update this task.",
    };
  }

  const taskRow = await query<{
    task_type: string;
    title: string;
    description: string | null;
    due_date: Date | null;
    priority: string | null;
  }>(
    `SELECT task_type, title, description, due_date, priority FROM task WHERE id = $1`,
    [parsed.data.taskId],
  );
  const current = taskRow.rows[0];

  const doneAssignment = await query<{ id: number }>(
    `
    SELECT id
    FROM task_assignment
    WHERE task_id = $1
      AND status = 'DONE'
    LIMIT 1
    `,
    [parsed.data.taskId],
  );

  if (doneAssignment.rows[0]) {
    return {
      success: false,
      message:
        "This task is already done. Only the status can be changed with confirmation.",
    };
  }

  const nextDueDate =
    parsed.data.dueDate !== undefined
      ? parseDueDate(parsed.data.dueDate)
      : (current?.due_date?.toISOString() ?? null);

  if (current?.task_type === "GRADED" && !nextDueDate) {
    return {
      success: false,
      message: "Due date is required for graded tasks.",
    };
  }

  try {
    const normalizedDescription =
      parsed.data.description === undefined || parsed.data.description === null
        ? parsed.data.description
        : normalizeRichTextForStorage(parsed.data.description);

    await transaction(async (client) => {
      await client.query(
        `
        UPDATE task
        SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          due_date = COALESCE($4, due_date),
          priority = COALESCE($5, priority),
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.taskId,
          parsed.data.title ?? null,
          normalizedDescription ?? null,
          nextDueDate,
          parsed.data.priority ?? null,
        ],
      );

      await insertTaskActivityLog(client, {
        taskId: parsed.data.taskId,
        actorProfileId: context.profile.id,
        action: "TASK_UPDATED",
        notes: "Task details updated.",
        metadata: {
          previous: {
            title: current?.title,
            description: current?.description,
            dueDate: current?.due_date?.toISOString() ?? null,
            priority: current?.priority,
          },
          next: {
            title: parsed.data.title ?? current?.title,
            description:
              parsed.data.description === undefined
                ? current?.description
                : normalizedDescription,
            dueDate: nextDueDate,
            priority: parsed.data.priority ?? current?.priority,
          },
        },
      });
    });

    revalidateTaskRoutes();

    return { success: true, message: "Task updated successfully." };
  } catch (error) {
    console.error("updateTask failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function deleteTask(input: unknown): Promise<ActionResult> {
  const authorization = await authorizeTaskAction([
    "tasks.delete",
    "tasks.manage_all",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:delete");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = deleteTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid task delete request.",
    };
  }

  const parentTask = await query<{ created_by_profile_id: number }>(
    `SELECT created_by_profile_id FROM task WHERE id = $1`,
    [parsed.data.taskId],
  );

  if (!parentTask.rows[0]) {
    return { success: false, message: "Task was not found." };
  }

  const { context } = authorization;
  const canManageAll = await can(
    context.profile.auth_user_id,
    "tasks.manage_all",
  );

  if (
    !canManageAll &&
    parentTask.rows[0].created_by_profile_id !== context.profile.id
  ) {
    return {
      success: false,
      message: "You do not have permission to delete this task.",
    };
  }

  try {
    await query(`DELETE FROM task WHERE id = $1`, [parsed.data.taskId]);
    revalidateTaskRoutes();

    return { success: true, message: "Task deleted successfully." };
  } catch (error) {
    console.error("deleteTask failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function submitTaskProof(
  input: unknown,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  const authorization = await authorizeTaskAction(["tasks.submit_proof"]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:submit-proof");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = submitTaskProofSchema.safeParse(
    normalizeSubmitTaskProofInput(input),
  );

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid proof submission.",
    };
  }

  const assignment = await getTaskAssignmentById(parsed.data.assignmentId);

  if (!assignment) {
    return { success: false, message: "Task assignment was not found." };
  }

  const { context } = authorization;

  if (assignment.assignedToProfileId !== context.profile.id) {
    return {
      success: false,
      message: "You can only submit proof for your own assigned tasks.",
    };
  }

  const nextStatus = isPersonalTaskType(assignment.taskType) ? "DONE" : "PENDING";

  if (!["ASSIGNED", "REVISION"].includes(assignment.status)) {
    return {
      success: false,
      message: "Proof can only be submitted from Assigned or Revision.",
    };
  }

  try {
    const proofUrl =
      parsed.data.proofType === "LINK" || parsed.data.proofType === "IMAGE"
        ? parsed.data.proofUrl
        : null;
    const proofNote =
      parsed.data.proofType === "NOTE"
        ? normalizeRichTextForStorage(parsed.data.proofNote)
        : null;

    await transaction(async (client) => {
      await client.query(
        `
        UPDATE task_assignment
        SET
          status = $2,
          proof_type = $3,
          proof_url = $4,
          proof_note = $5,
          submitted_at = now(),
          completed_at = CASE WHEN $2 = 'DONE' THEN now() ELSE completed_at END,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.assignmentId,
          nextStatus,
          parsed.data.proofType,
          proofUrl,
          proofNote,
        ],
      );

      await insertTaskActivityLog(client, {
        taskId: assignment.taskId,
        assignmentId: assignment.assignmentId,
        actorProfileId: context.profile.id,
        action:
          nextStatus === "DONE"
            ? "TASK_MARKED_DONE"
            : assignment.status === "REVISION"
              ? "PROOF_RESUBMITTED"
              : "PROOF_SUBMITTED",
        fromStatus: assignment.status,
        toStatus: nextStatus,
        notes: proofNote ?? proofUrl,
        metadata: {
          proofType: parsed.data.proofType,
          proofUrl,
          hasProofNote: Boolean(proofNote),
        },
      });
    });

    return buildTaskAssignmentUpdateResult(
      parsed.data.assignmentId,
      "Proof submitted for review.",
    );
  } catch (error) {
    console.error("submitTaskProof failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function reportTaskBlocker(
  input: unknown,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  const authorization = await authorizeTaskAction(["tasks.submit_proof"]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:blocker");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = reportTaskBlockerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid blocker report.",
    };
  }

  const assignment = await getTaskAssignmentById(parsed.data.assignmentId);

  if (!assignment) {
    return { success: false, message: "Task assignment was not found." };
  }

  const { context } = authorization;

  if (assignment.assignedToProfileId !== context.profile.id) {
    return {
      success: false,
      message: "You can only report blockers for your own assigned tasks.",
    };
  }

  if (!["ASSIGNED", "REVISION"].includes(assignment.status)) {
    return {
      success: false,
      message: "Blockers can only be reported from Assigned or Revision.",
    };
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `
        UPDATE task_assignment
        SET
          status = 'BLOCKER',
          blocker_note = $2,
          blocker_reported_at = now(),
          blocker_reported_by_profile_id = $3,
          blocker_confirmed_at = NULL,
          blocker_confirmed_by_profile_id = NULL,
          blocker_resolution_note = NULL,
          updated_at = now()
        WHERE id = $1
        `,
        [parsed.data.assignmentId, parsed.data.blockerNote, context.profile.id],
      );

      await insertTaskActivityLog(client, {
        taskId: assignment.taskId,
        assignmentId: assignment.assignmentId,
        actorProfileId: context.profile.id,
        action: "BLOCKER_REPORTED",
        fromStatus: assignment.status,
        toStatus: "BLOCKER",
        notes: parsed.data.blockerNote,
      });
    });

    return buildTaskAssignmentUpdateResult(
      parsed.data.assignmentId,
      "Blocker reported for review.",
    );
  } catch (error) {
    console.error("reportTaskBlocker failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function confirmTaskBlocker(
  input: unknown,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  const authorization = await authorizeTaskAction([
    "tasks.review",
    "tasks.manage_all",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:blocker-confirm");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = confirmTaskBlockerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid blocker update.",
    };
  }

  const assignment = await getTaskAssignmentById(parsed.data.assignmentId);

  if (!assignment) {
    return { success: false, message: "Task assignment was not found." };
  }

  const { context } = authorization;
  const canManageAll = await can(
    context.profile.auth_user_id,
    "tasks.manage_all",
  );

  if (
    !canAdminManageAssignment({
      canManageAll,
      creatorProfileId: assignment.createdByProfileId,
      actorProfileId: context.profile.id,
    })
  ) {
    return {
      success: false,
      message: "You do not have permission to resolve this blocker.",
    };
  }

  const reviewBlockReason = getGradedTaskReviewBlockReason(
    assignment,
    context.profile.id,
  );

  if (reviewBlockReason) {
    return {
      success: false,
      message: reviewBlockReason,
    };
  }

  if (assignment.status !== "BLOCKER") {
    return {
      success: false,
      message: "Only blocker tasks can be confirmed or resolved.",
    };
  }

  if (
    parsed.data.nextStatus === "PENDING" &&
    !assignment.proofUrl &&
    !assignment.proofNote
  ) {
    return {
      success: false,
      message: "Blocker can only move to Pending when proof already exists.",
    };
  }

  try {
    const nextDueDate =
      parsed.data.dueDate !== undefined
        ? parseDueDate(parsed.data.dueDate)
        : assignment.dueDate;
    const deadlineChanged = nextDueDate !== assignment.dueDate;

    await transaction(async (client) => {
      if (deadlineChanged) {
        await client.query(
          `
          UPDATE task
          SET due_date = $2,
              updated_at = now()
          WHERE id = $1
          `,
          [assignment.taskId, nextDueDate],
        );
      }

      await client.query(
        `
        UPDATE task_assignment
        SET
          status = $2,
          blocker_confirmed_at = now(),
          blocker_confirmed_by_profile_id = $3,
          blocker_resolution_note = $4,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.assignmentId,
          parsed.data.nextStatus,
          context.profile.id,
          parsed.data.resolutionNote,
        ],
      );

      await insertTaskActivityLog(client, {
        taskId: assignment.taskId,
        assignmentId: assignment.assignmentId,
        actorProfileId: context.profile.id,
        action:
          parsed.data.nextStatus === "BLOCKER"
            ? "BLOCKER_CONFIRMED"
            : "BLOCKER_RESOLVED",
        fromStatus: assignment.status,
        toStatus: parsed.data.nextStatus,
        notes: parsed.data.resolutionNote,
        metadata: deadlineChanged
          ? {
              deadline_changed_from: assignment.dueDate,
              deadline_changed_to: nextDueDate,
            }
          : null,
      });

      if (deadlineChanged) {
        await insertTaskActivityLog(client, {
          taskId: assignment.taskId,
          assignmentId: assignment.assignmentId,
          actorProfileId: context.profile.id,
          action: "DEADLINE_CHANGED",
          notes: parsed.data.resolutionNote,
          metadata: {
            deadline_changed_from: assignment.dueDate,
            deadline_changed_to: nextDueDate,
          },
        });
      }
    });

    return buildTaskAssignmentUpdateResult(
      parsed.data.assignmentId,
      "Blocker updated successfully.",
    );
  } catch (error) {
    console.error("confirmTaskBlocker failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function changeTaskAssignmentStatus(
  input: unknown,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  const authorization = await authorizeTaskAction([
    "tasks.review",
    "tasks.manage_all",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:status-change");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = changeTaskAssignmentStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid status change.",
    };
  }

  const assignment = await getTaskAssignmentById(parsed.data.assignmentId);

  if (!assignment) {
    return { success: false, message: "Task assignment was not found." };
  }

  const { context } = authorization;
  const canManageAll = await can(
    context.profile.auth_user_id,
    "tasks.manage_all",
  );

  if (
    !canAdminManageAssignment({
      canManageAll,
      creatorProfileId: assignment.createdByProfileId,
      actorProfileId: context.profile.id,
    })
  ) {
    return {
      success: false,
      message: "You do not have permission to change this task status.",
    };
  }

  const reviewBlockReason = getGradedTaskReviewBlockReason(
    assignment,
    context.profile.id,
  );

  if (reviewBlockReason) {
    return {
      success: false,
      message: reviewBlockReason,
    };
  }

  if (parsed.data.fromStatus !== assignment.status) {
    return {
      success: false,
      message: "This task status changed. Please refresh and try again.",
    };
  }

  if (parsed.data.toStatus === assignment.status) {
    return {
      success: true,
      message: "No status change was needed.",
      data: { updatedAssignment: assignment },
    };
  }

  if (!assertAdminTransitionAllowed(assignment.status, parsed.data.toStatus)) {
    return {
      success: false,
      message: "This status change is not allowed.",
    };
  }

  if (
    assignment.status === "BLOCKER" &&
    parsed.data.toStatus === "PENDING" &&
    !assignment.proofUrl &&
    !assignment.proofNote
  ) {
    return {
      success: false,
      message: "Blocker can only move to Pending when proof already exists.",
    };
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `
        UPDATE task_assignment
        SET
          status = $2,
          completed_at = CASE WHEN $2 = 'DONE' THEN COALESCE(completed_at, now()) ELSE NULL END,
          reviewed_by_profile_id = CASE WHEN $2 IN ('DONE', 'REVISION') THEN $3 ELSE reviewed_by_profile_id END,
          reviewed_at = CASE WHEN $2 IN ('DONE', 'REVISION') THEN now() ELSE reviewed_at END,
          updated_at = now()
        WHERE id = $1
        `,
        [parsed.data.assignmentId, parsed.data.toStatus, context.profile.id],
      );

      await insertTaskActivityLog(client, {
        taskId: assignment.taskId,
        assignmentId: assignment.assignmentId,
        actorProfileId: context.profile.id,
        action:
          assignment.status === "DONE"
            ? "TASK_REOPENED"
            : parsed.data.toStatus === "DONE"
              ? "TASK_MARKED_DONE"
              : "STATUS_CHANGED",
        fromStatus: assignment.status,
        toStatus: parsed.data.toStatus,
        notes: parsed.data.notes,
      });
    });

    return buildTaskAssignmentUpdateResult(
      parsed.data.assignmentId,
      "Task status updated successfully.",
    );
  } catch (error) {
    console.error("changeTaskAssignmentStatus failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function confirmTaskDone(
  input: unknown,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  const authorization = await authorizeTaskAction([
    "tasks.review",
    "tasks.manage_all",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:confirm-done");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = confirmTaskDoneSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid confirmation request.",
    };
  }

  const assignment = await getTaskAssignmentById(parsed.data.assignmentId);

  if (!assignment) {
    return { success: false, message: "Task assignment was not found." };
  }

  const { context } = authorization;

  const reviewBlockReason = getGradedTaskReviewBlockReason(
    assignment,
    context.profile.id,
  );

  if (reviewBlockReason) {
    return {
      success: false,
      message: reviewBlockReason,
    };
  }

  if (
    !canReviewTaskAssignments(context.profile.account_type) &&
    !(await can(context.profile.auth_user_id, "tasks.review"))
  ) {
    return {
      success: false,
      message: "You do not have permission to review tasks.",
    };
  }

  if (assignment.status !== "PENDING") {
    return {
      success: false,
      message: "Only pending tasks can be confirmed as done.",
    };
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `
        UPDATE task_assignment
        SET
          status = 'DONE',
          completed_at = now(),
          reviewed_by_profile_id = $2,
          reviewed_at = now(),
          updated_at = now()
        WHERE id = $1
        `,
        [parsed.data.assignmentId, context.profile.id],
      );

      await insertTaskActivityLog(client, {
        taskId: assignment.taskId,
        assignmentId: assignment.assignmentId,
        actorProfileId: context.profile.id,
        action: "TASK_MARKED_DONE",
        fromStatus: assignment.status,
        toStatus: "DONE",
        notes: "Task confirmed as done.",
      });
    });

    return buildTaskAssignmentUpdateResult(
      parsed.data.assignmentId,
      "Task confirmed as done.",
    );
  } catch (error) {
    console.error("confirmTaskDone failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function requestTaskRevision(
  input: unknown,
): Promise<ActionResult<TaskAssignmentUpdateData>> {
  const authorization = await authorizeTaskAction([
    "tasks.review",
    "tasks.manage_all",
  ]);

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimitError = await guardTaskMutationRateLimit("task:revision");

  if (rateLimitError) {
    return rateLimitError;
  }

  const parsed = requestTaskRevisionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid revision request.",
    };
  }

  const assignment = await getTaskAssignmentById(parsed.data.assignmentId);

  if (!assignment) {
    return { success: false, message: "Task assignment was not found." };
  }

  const { context } = authorization;

  const reviewBlockReason = getGradedTaskReviewBlockReason(
    assignment,
    context.profile.id,
  );

  if (reviewBlockReason) {
    return {
      success: false,
      message: reviewBlockReason,
    };
  }

  if (
    !canReviewTaskAssignments(context.profile.account_type) &&
    !(await can(context.profile.auth_user_id, "tasks.review"))
  ) {
    return {
      success: false,
      message: "You do not have permission to request revisions.",
    };
  }

  if (assignment.status !== "PENDING") {
    return {
      success: false,
      message: "Only pending tasks can be sent back for revision.",
    };
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `
        UPDATE task_assignment
        SET
          status = 'REVISION',
          revision_note = $2,
          reviewed_by_profile_id = $3,
          reviewed_at = now(),
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.assignmentId,
          parsed.data.revisionNote,
          context.profile.id,
        ],
      );

      await insertTaskActivityLog(client, {
        taskId: assignment.taskId,
        assignmentId: assignment.assignmentId,
        actorProfileId: context.profile.id,
        action: "REVISION_REQUESTED",
        fromStatus: assignment.status,
        toStatus: "REVISION",
        notes: parsed.data.revisionNote,
      });
    });

    return buildTaskAssignmentUpdateResult(
      parsed.data.assignmentId,
      "Revision requested.",
    );
  } catch (error) {
    console.error("requestTaskRevision failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function getCanReviewTasks(): Promise<boolean> {
  const context = await getCurrentProfileContext();

  if (!context || context.profile.status !== "ACTIVE") {
    return false;
  }

  if (context.profile.account_type === "FULL_STACK_DEVELOPER") {
    return false;
  }

  return (
    canReviewTaskAssignments(context.profile.account_type) ||
    (await can(context.profile.auth_user_id, "tasks.review"))
  );
}

export async function getIsEmployeeAccount(): Promise<boolean> {
  const context = await getCurrentProfileContext();
  return context ? !isAdminAccountType(context.profile.account_type) : false;
}
