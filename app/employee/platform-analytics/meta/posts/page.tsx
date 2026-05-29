import { requireEmployee } from "@/lib/auth/auth-session";
import { canViewPlatformAnalytics } from "@/lib/platform-analytics/access";
import { renderMetaPostsAnalyticsPage } from "@/lib/platform-analytics/meta-posts-page";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Meta Posts Analytics",
  description: "Facebook post-level analytics per enabled Meta business page.",
};

type MetaPostsPageProps = {
  searchParams: Promise<{
    pageKey?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    postId?: string;
  }>;
};

export default async function EmployeeMetaPostsAnalyticsPage({
  searchParams,
}: MetaPostsPageProps) {
  const { profile } = await requireEmployee();
  const allowed = await canViewPlatformAnalytics(profile.auth_user_id);

  if (!allowed) {
    redirect("/employee/unauthorized?permission=platform_analytics.view");
  }

  const params = await searchParams;

  return renderMetaPostsAnalyticsPage({
    analyticsBasePath: "/employee/platform-analytics",
    searchParams: params,
  });
}
