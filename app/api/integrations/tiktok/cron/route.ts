import { NextResponse } from "next/server";

import { getTikTokCronSecret } from "@/lib/tiktok/config";
import { syncAllTikTokIntegrations } from "@/lib/tiktok/sync";

export const runtime = "nodejs";

function authorizeCron(request: Request) {
  const secret = getTikTokCronSecret();
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-meta-cron-secret");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllTikTokIntegrations();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok cron sync failed";
    console.error("TikTok cron error:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
