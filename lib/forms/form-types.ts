export const FORM_TYPES = [
  "STRATEGY_CALL_NOTES",
  "CLIENT_ONBOARDING",
  "STRATEGY_CALL_BOOKING",
  "INTERNAL_ONBOARDING_CHECKLIST",
  "MONTHLY_REPORT_RENEWAL",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  STRATEGY_CALL_NOTES: "Strategy Call Notes",
  CLIENT_ONBOARDING: "Client Onboarding Form",
  STRATEGY_CALL_BOOKING: "Strategy Call Booking Form",
  INTERNAL_ONBOARDING_CHECKLIST: "Internal Onboarding Checklist",
  MONTHLY_REPORT_RENEWAL: "Monthly Report & Renewal Checklist",
};

export const DEFAULT_FORM_TYPE: FormType = "STRATEGY_CALL_NOTES";

export type FormSubmissionRecord = {
  id: number;
  formType: FormType;
  payload: Record<string, unknown>;
  createdByProfileId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};
