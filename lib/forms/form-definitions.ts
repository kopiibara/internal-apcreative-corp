import {
  DEFAULT_FORM_TYPE,
  FORM_TYPE_LABELS,
  type FormType,
} from "@/lib/forms/form-types";

export type FormFieldDefinition =
  | {
      key: string;
      label: string;
      type: "text" | "email" | "textarea" | "date";
      placeholder?: string;
      required?: boolean;
      fullWidth?: boolean;
    }
  | {
      key: string;
      label: string;
      type: "select";
      options: string[];
      required?: boolean;
    }
  | {
      key: string;
      label: string;
      type: "checklist";
      options: string[];
      fullWidth?: boolean;
    };

export type FormDefinition = {
  title: string;
  description: string;
  submitLabel: string;
  fields: FormFieldDefinition[];
  tableFields: string[];
};

export const FORM_FILTER_OPTIONS = (
  Object.keys(FORM_TYPE_LABELS) as FormType[]
).map((formType) => ({
  value: formType,
  label:
    formType === DEFAULT_FORM_TYPE
      ? `${FORM_TYPE_LABELS[formType]} (Default)`
      : FORM_TYPE_LABELS[formType],
}));

export const FORM_DEFINITIONS: Record<FormType, FormDefinition> = {
  STRATEGY_CALL_NOTES: {
    title: "Strategy Call Notes",
    description: "For AP Creative sales or account team during the discovery call.",
    submitLabel: "Save Notes",
    tableFields: ["clientName", "callDate", "recommendedPackage", "leadQuality", "nextStep"],
    fields: [
      { key: "clientName", label: "Client name", type: "text", placeholder: "Client / Brand", required: true },
      { key: "callDate", label: "Call date", type: "date", required: true },
      {
        key: "recommendedPackage",
        label: "Recommended package",
        type: "select",
        required: true,
        options: ["Ignite", "Accelerate", "Dominate", "Custom"],
      },
      {
        key: "leadQuality",
        label: "Lead quality",
        type: "select",
        required: true,
        options: ["Hot Lead", "Warm Lead", "Cold Lead", "Needs Follow-up"],
      },
      {
        key: "keyBusinessGoals",
        label: "Key business goals",
        type: "textarea",
        placeholder: "Summarize the client's goal and desired outcome.",
        required: true,
        fullWidth: true,
      },
      {
        key: "painPoints",
        label: "Pain points / problems",
        type: "textarea",
        placeholder: "List marketing problems, sales issues, branding gaps, website issues, or operational blockers.",
        required: true,
        fullWidth: true,
      },
      {
        key: "qualificationChecklist",
        label: "Package qualification checklist",
        type: "checklist",
        fullWidth: true,
        options: [
          "Has clear business goal",
          "Has realistic budget",
          "Has decision-maker involved",
          "Needs monthly retainer",
          "Needs website / landing page",
          "Needs ads and lead generation",
          "Needs content production",
        ],
      },
      {
        key: "nextStep",
        label: "Next step",
        type: "textarea",
        placeholder: "Send proposal, request assets, schedule follow-up, prepare mockup...",
        required: true,
        fullWidth: true,
      },
    ],
  },
  CLIENT_ONBOARDING: {
    title: "Client Onboarding Form",
    description: "For approved clients after proposal approval, contract confirmation, and payment arrangement.",
    submitLabel: "Submit Onboarding",
    tableFields: ["companyLegalName", "brandName", "mainContactPerson", "reportingPreference", "importantLaunchDate"],
    fields: [
      { key: "companyLegalName", label: "Company legal name", type: "text", required: true },
      { key: "brandName", label: "Brand name", type: "text", required: true },
      { key: "mainContactPerson", label: "Main contact person", type: "text", required: true },
      { key: "approvalContact", label: "Approval contact", type: "text", required: true },
      { key: "businessAddressBranches", label: "Business address / branches", type: "text", fullWidth: true },
      {
        key: "reportingPreference",
        label: "Reporting preference",
        type: "select",
        required: true,
        options: ["Monthly PDF Report", "Dashboard Review", "Weekly Summary", "Custom"],
      },
      { key: "brandGuidelines", label: "Brand guidelines / do and don'ts", type: "textarea", fullWidth: true },
      { key: "productsServicesOffers", label: "Products, services, offers, or menu to promote", type: "textarea", fullWidth: true },
      {
        key: "accessNeeded",
        label: "Access needed",
        type: "checklist",
        fullWidth: true,
        options: [
          "Meta Business Suite",
          "Instagram Account",
          "Google Business Profile",
          "Website CMS",
          "Email Platform",
          "Facebook Page",
          "TikTok Account",
          "Google Ads",
          "Google Analytics",
          "CRM / Automation Tool",
        ],
      },
      { key: "assetLink", label: "Upload link for assets", type: "text", placeholder: "Google Drive / Dropbox folder link" },
      { key: "importantLaunchDate", label: "Important launch date", type: "date" },
      { key: "competitorsReferences", label: "Competitors and references", type: "textarea", fullWidth: true },
      { key: "legalComplianceRestrictions", label: "Legal / compliance restrictions", type: "textarea", fullWidth: true },
    ],
  },
  STRATEGY_CALL_BOOKING: {
    title: "Strategy Call Booking Form",
    description: "For prospects who want a consultation with AP Creative.",
    submitLabel: "Submit Booking",
    tableFields: ["fullName", "companyBrandName", "emailAddress", "industry", "targetLaunchDate"],
    fields: [
      { key: "fullName", label: "Full name", type: "text", placeholder: "Client full name", required: true },
      { key: "companyBrandName", label: "Company / brand name", type: "text", placeholder: "Business name", required: true },
      { key: "emailAddress", label: "Email address", type: "email", placeholder: "name@email.com", required: true },
      { key: "contactNumber", label: "Contact number", type: "text", placeholder: "09XX XXX XXXX", required: true },
      {
        key: "industry",
        label: "Industry",
        type: "select",
        required: true,
        options: ["Restaurant / Food", "Retail", "Service Business", "Beauty / Wellness", "Real Estate", "Other"],
      },
      { key: "websiteSocialLink", label: "Website / social link", type: "text", placeholder: "https://" },
      { key: "mainBusinessGoal", label: "Main business goal", type: "textarea", required: true, fullWidth: true },
      {
        key: "servicesInterestedIn",
        label: "Services interested in",
        type: "checklist",
        fullWidth: true,
        options: ["Social Media", "Meta Ads", "Google Ads", "SEO", "Website", "Automation", "Content Production", "Full Marketing Retainer"],
      },
      {
        key: "monthlyMarketingBudget",
        label: "Monthly marketing budget",
        type: "select",
        required: true,
        options: ["Below PHP 50,000", "PHP 50,000 - PHP 99,000", "PHP 100,000 - PHP 199,000", "PHP 200,000+"],
      },
      { key: "targetLaunchDate", label: "Target launch date", type: "date" },
      { key: "currentChallenges", label: "Current challenges", type: "textarea", fullWidth: true },
    ],
  },
  INTERNAL_ONBOARDING_CHECKLIST: {
    title: "Internal Onboarding Checklist",
    description: "For AP Creative internal preparation before execution.",
    submitLabel: "Mark Prepared",
    tableFields: ["assignedTeam", "setupChecklist", "internalNotes"],
    fields: [
      {
        key: "assignedTeam",
        label: "Assigned team",
        type: "checklist",
        fullWidth: true,
        options: [
          "Account Manager assigned",
          "Marketing Strategist assigned",
          "Graphic Designer assigned",
          "Multimedia Artist assigned",
          "Ads Specialist assigned",
          "SEO Specialist assigned if needed",
          "Web Developer assigned if needed",
          "Events Coordinator assigned if needed",
        ],
      },
      {
        key: "setupChecklist",
        label: "Setup checklist",
        type: "checklist",
        fullWidth: true,
        options: [
          "Project folder created",
          "Task board created",
          "Client brief completed",
          "Content calendar started",
          "Reporting dashboard prepared",
          "Approval workflow confirmed",
        ],
      },
      { key: "internalNotes", label: "Internal notes", type: "textarea", fullWidth: true },
    ],
  },
  MONTHLY_REPORT_RENEWAL: {
    title: "Monthly Report & Renewal Checklist",
    description: "For account managers before sending monthly reports and recommending next steps.",
    submitLabel: "Save Report Notes",
    tableFields: ["reportingMonth", "clientStatus", "metricsReviewed", "nextMonthRecommendations"],
    fields: [
      { key: "reportingMonth", label: "Reporting month", type: "date", required: true },
      {
        key: "clientStatus",
        label: "Client status",
        type: "select",
        required: true,
        options: ["Healthy", "Needs Attention", "At Risk", "Renewal Ready"],
      },
      {
        key: "metricsReviewed",
        label: "Metrics reviewed",
        type: "checklist",
        fullWidth: true,
        options: ["Social media reach", "Engagement", "Leads", "Sales / bookings", "Ad spend", "Cost per lead", "Website traffic", "SEO progress", "Reviews / reputation", "Email / automation"],
      },
      { key: "keyWins", label: "Key wins", type: "textarea", required: true, fullWidth: true },
      { key: "nextMonthRecommendations", label: "Next month recommendations", type: "textarea", required: true, fullWidth: true },
      { key: "upsellRenewalOpportunity", label: "Upsell / renewal opportunity", type: "textarea", fullWidth: true },
    ],
  },
};

export function getDefaultFormPayload(formType: FormType) {
  const definition = FORM_DEFINITIONS[formType];

  return Object.fromEntries(
    definition.fields.map((field) => [
      field.key,
      field.type === "checklist" ? [] : field.type === "select" ? field.options[0] : "",
    ]),
  ) as Record<string, string | string[]>;
}
