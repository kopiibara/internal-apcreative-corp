import "server-only";

import { query } from "@/lib/db";
import {
  FORM_TYPES,
  type FormSubmissionRecord,
  type FormType,
} from "@/lib/forms/form-types";

type FormSubmissionRow = {
  id: number;
  form_type: FormType;
  payload: Record<string, unknown>;
  created_by_profile_id: number;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
};

function isFormType(value: string): value is FormType {
  return (FORM_TYPES as readonly string[]).includes(value);
}

function mapFormSubmission(row: FormSubmissionRow): FormSubmissionRecord {
  return {
    id: row.id,
    formType: row.form_type,
    payload: row.payload,
    createdByProfileId: row.created_by_profile_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getFormSubmissions(formType?: FormType) {
  const result = await query<FormSubmissionRow>(
    `
    SELECT
      fs.id,
      fs.form_type,
      fs.payload,
      fs.created_by_profile_id,
      creator.full_name AS created_by_name,
      fs.created_at,
      fs.updated_at
    FROM form_submission fs
    JOIN profile creator ON creator.id = fs.created_by_profile_id
    WHERE ($1::text IS NULL OR fs.form_type = $1::text)
    ORDER BY fs.created_at DESC, fs.id DESC
    `,
    [formType ?? null],
  );

  return result.rows.map(mapFormSubmission);
}

export function parseFormType(value: string | undefined): FormType | undefined {
  return value && isFormType(value) ? value : undefined;
}
