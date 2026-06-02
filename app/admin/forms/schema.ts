import { z } from "zod";

import { FORM_TYPES } from "@/lib/forms/form-types";

const optionalText = z.string().trim().max(5000).optional().default("");
const requiredText = z.string().trim().min(1, "This field is required.").max(5000);
const dateKey = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");
const optionalDateKey = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Date must use YYYY-MM-DD format.",
  });
const checkboxList = z.array(z.string().trim().min(1).max(120)).default([]);

export const strategyCallNotesPayloadSchema = z.object({
  clientName: requiredText,
  callDate: dateKey,
  recommendedPackage: requiredText,
  leadQuality: requiredText,
  keyBusinessGoals: requiredText,
  painPoints: requiredText,
  qualificationChecklist: checkboxList,
  nextStep: requiredText,
});

export const clientOnboardingPayloadSchema = z.object({
  companyLegalName: requiredText,
  brandName: requiredText,
  mainContactPerson: requiredText,
  approvalContact: requiredText,
  businessAddressBranches: optionalText,
  reportingPreference: requiredText,
  brandGuidelines: optionalText,
  productsServicesOffers: optionalText,
  accessNeeded: checkboxList,
  assetLink: optionalText,
  importantLaunchDate: optionalDateKey,
  competitorsReferences: optionalText,
  legalComplianceRestrictions: optionalText,
});

export const strategyCallBookingPayloadSchema = z.object({
  fullName: requiredText,
  companyBrandName: requiredText,
  emailAddress: z.string().trim().email("Enter a valid email address."),
  contactNumber: requiredText,
  industry: requiredText,
  websiteSocialLink: optionalText,
  mainBusinessGoal: requiredText,
  servicesInterestedIn: checkboxList,
  monthlyMarketingBudget: requiredText,
  targetLaunchDate: optionalDateKey,
  currentChallenges: optionalText,
});

export const internalOnboardingPayloadSchema = z.object({
  assignedTeam: checkboxList,
  setupChecklist: checkboxList,
  internalNotes: optionalText,
});

export const monthlyReportRenewalPayloadSchema = z.object({
  reportingMonth: dateKey,
  clientStatus: requiredText,
  metricsReviewed: checkboxList,
  keyWins: requiredText,
  nextMonthRecommendations: requiredText,
  upsellRenewalOpportunity: optionalText,
});

export const formSubmissionPayloadSchemas = {
  STRATEGY_CALL_NOTES: strategyCallNotesPayloadSchema,
  CLIENT_ONBOARDING: clientOnboardingPayloadSchema,
  STRATEGY_CALL_BOOKING: strategyCallBookingPayloadSchema,
  INTERNAL_ONBOARDING_CHECKLIST: internalOnboardingPayloadSchema,
  MONTHLY_REPORT_RENEWAL: monthlyReportRenewalPayloadSchema,
} as const;

export const createFormSubmissionSchema = z.object({
  formType: z.enum(FORM_TYPES),
  payload: z.record(z.string(), z.unknown()),
});

export type CreateFormSubmissionInput = z.infer<
  typeof createFormSubmissionSchema
>;
