import type {
  AnalyticsPlatform,
  PlatformCode,
} from "@/lib/platform-analytics/types";

export const PLATFORM_NAV: { value: AnalyticsPlatform; label: string }[] = [
  { value: "META", label: "Meta" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "GOOGLE", label: "Google" },
];

export const PAGE_TITLE = "";

export const PAGE_SUBTITLE = "";

export const PLATFORM_LABELS: Record<PlatformCode, string> = {
  META: "Meta",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  GOOGLE: "Google",
};

export const PLATFORM_VIEW_COPY: Record<
  PlatformCode,
  { title: string; subtitle: string; liveBadge: string; demoBadge: string }
> = {
  META: {
    title: "Meta Analytics",
    subtitle:
      "Facebook analytics per enabled business page. Each active page has its own status, metrics, and post table.",
    liveBadge: "Live Integration",
    demoBadge: "Not Connected",
  },
  TIKTOK: {
    title: "TikTok Analytics",
    subtitle:
      "Connect a TikTok account per brand to sync profile metrics, videos, and performance snapshots from the official TikTok API.",
    liveBadge: "Live Integration",
    demoBadge: "Not Connected",
  },
  YOUTUBE: {
    title: "YouTube Analytics",
    subtitle:
      "Track YouTube channel performance, subscribers, views, watch time, video engagement, and webhook activity once connected.",
    liveBadge: "Live Integration",
    demoBadge: "Demo Data",
  },
  GOOGLE: {
    title: "Google Ads Analytics",
    subtitle:
      "Track Google Ads performance, campaign results, impressions, clicks, spend, conversions, and webhook activity once connected.",
    liveBadge: "Live Integration",
    demoBadge: "Demo Data",
  },
};

export const META_SCOPE_OPTIONS = [
  { value: "combined", label: "Combined" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
] as const;
