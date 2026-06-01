export const PR_REQUEST_TYPES = ["INFLUENCER", "BRAND_PARTNERSHIP"] as const;
export const PR_INFLUENCER_SIZES = ["MICRO", "MACRO"] as const;
export const PR_CONTACT_STATUSES = ["PENDING", "CONTACTED", "DECLINED"] as const;
export const PR_COLLABORATION_STATUSES = ["PENDING", "PAID", "NA"] as const;

export type PRRequestType = (typeof PR_REQUEST_TYPES)[number];
export type PRInfluencerSize = (typeof PR_INFLUENCER_SIZES)[number];
export type PRContactStatus = (typeof PR_CONTACT_STATUSES)[number];
export type PRCollaborationStatus = (typeof PR_COLLABORATION_STATUSES)[number];
