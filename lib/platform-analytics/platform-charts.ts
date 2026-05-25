import type {
  GrowthSnapshotRow,
  PlatformChartConfig,
  PlatformCode,
} from "@/lib/platform-analytics/types"

export function buildMetaCharts(snapshots: GrowthSnapshotRow[]): PlatformChartConfig[] {
  const trend = snapshots.length
    ? [...snapshots].reverse().map((row) => ({
        label: row.date,
        followers: row.followers ?? 0,
        reach: row.secondaryValue ?? 0,
      }))
    : [
        { label: "Mon", followers: 0, reach: 0 },
        { label: "Tue", followers: 0, reach: 0 },
      ]

  return [
    {
      id: "meta-followers",
      title: "Followers growth",
      description: "Daily follower trend from synced snapshots",
      data: trend,
      keys: [
        { key: "followers", label: "Followers", color: "var(--chart-1)" },
      ],
      chartType: "line",
    },
    {
      id: "meta-reach-impressions",
      title: "Reach vs impressions",
      data: trend.map((row) => ({
        label: row.label,
        reach: row.reach,
        impressions: Math.round(row.reach * 1.2),
      })),
      keys: [
        { key: "reach", label: "Reach", color: "var(--chart-2)" },
        { key: "impressions", label: "Impressions", color: "var(--chart-3)" },
      ],
      chartType: "area",
    },
    {
      id: "meta-engagement",
      title: "Engagement trend",
      data: [
        { label: "Week 1", engagements: 120 },
        { label: "Week 2", engagements: 180 },
        { label: "Week 3", engagements: 150 },
        { label: "Week 4", engagements: 210 },
      ],
      keys: [{ key: "engagements", label: "Engagements", color: "var(--chart-4)" }],
      chartType: "bar",
    },
    {
      id: "meta-reactions",
      title: "Reactions breakdown",
      data: [
        { label: "Like", value: 62 },
        { label: "Love", value: 18 },
        { label: "Wow", value: 8 },
        { label: "Other", value: 12 },
      ],
      keys: [{ key: "value", label: "Reactions", color: "var(--chart-5)" }],
      chartType: "bar",
    },
  ]
}

export function getDemoCharts(platform: PlatformCode): PlatformChartConfig[] {
  if (platform === "TIKTOK") {
    return [
      {
        id: "tt-views",
        title: "Video views trend",
        data: [
          { label: "Mon", views: 14200 },
          { label: "Tue", views: 15800 },
          { label: "Wed", views: 17100 },
          { label: "Thu", views: 18900 },
          { label: "Fri", views: 28800 },
        ],
        keys: [{ key: "views", label: "Views", color: "var(--chart-1)" }],
        chartType: "line",
      },
      {
        id: "tt-followers",
        title: "Followers growth",
        data: [
          { label: "W1", followers: 17800 },
          { label: "W2", followers: 18100 },
          { label: "W3", followers: 18320 },
          { label: "W4", followers: 18420 },
        ],
        keys: [{ key: "followers", label: "Followers", color: "var(--chart-2)" }],
        chartType: "area",
      },
      {
        id: "tt-engagement-rate",
        title: "Engagement rate trend",
        data: [
          { label: "W1", rate: 5.8 },
          { label: "W2", rate: 6.1 },
          { label: "W3", rate: 6.4 },
          { label: "W4", rate: 6.55 },
        ],
        keys: [{ key: "rate", label: "Rate %", color: "var(--chart-3)" }],
        chartType: "line",
      },
      {
        id: "tt-breakdown",
        title: "Likes, comments, and shares",
        data: [
          { label: "Likes", value: 4950 },
          { label: "Comments", value: 480 },
          { label: "Shares", value: 780 },
        ],
        keys: [{ key: "value", label: "Count", color: "var(--chart-4)" }],
        chartType: "bar",
      },
      {
        id: "tt-top-videos",
        title: "Top videos ranking",
        data: [
          { label: "Weekend Bar Teaser", views: 29600 },
          { label: "Product Drop", views: 21400 },
          { label: "Behind the Scenes", views: 18200 },
        ],
        keys: [{ key: "views", label: "Views", color: "var(--chart-5)" }],
        chartType: "bar",
      },
    ]
  }

  if (platform === "YOUTUBE") {
    return [
      {
        id: "yt-views",
        title: "Views trend",
        data: [
          { label: "Mon", views: 4200 },
          { label: "Tue", views: 5100 },
          { label: "Wed", views: 4800 },
          { label: "Thu", views: 6200 },
          { label: "Fri", views: 7100 },
        ],
        keys: [{ key: "views", label: "Views", color: "var(--chart-1)" }],
        chartType: "line",
      },
      {
        id: "yt-subs",
        title: "Subscribers growth",
        data: [
          { label: "W1", subscribers: 7620 },
          { label: "W2", subscribers: 7710 },
          { label: "W3", subscribers: 7790 },
          { label: "W4", subscribers: 7850 },
        ],
        keys: [{ key: "subscribers", label: "Subscribers", color: "var(--chart-2)" }],
        chartType: "area",
      },
      {
        id: "yt-watch",
        title: "Watch time trend",
        data: [
          { label: "W1", hours: 980 },
          { label: "W2", hours: 1050 },
          { label: "W3", hours: 1120 },
          { label: "W4", hours: 1240 },
        ],
        keys: [{ key: "hours", label: "Hours", color: "var(--chart-3)" }],
        chartType: "bar",
      },
      {
        id: "yt-duration",
        title: "Average view duration",
        data: [
          { label: "W1", minutes: 2.1 },
          { label: "W2", minutes: 2.15 },
          { label: "W3", minutes: 2.17 },
          { label: "W4", minutes: 2.3 },
        ],
        keys: [{ key: "minutes", label: "Minutes", color: "var(--chart-4)" }],
        chartType: "line",
      },
      {
        id: "yt-top",
        title: "Top videos by views",
        data: [
          { label: "Neon Nights Recap", views: 12900 },
          { label: "Studio Tour", views: 8400 },
          { label: "Client Story", views: 6200 },
        ],
        keys: [{ key: "views", label: "Views", color: "var(--chart-5)" }],
        chartType: "bar",
      },
    ]
  }

  return [
    {
      id: "g-spend",
      title: "Spend trend",
      data: [
        { label: "W1", spend: 28000 },
        { label: "W2", spend: 32000 },
        { label: "W3", spend: 38000 },
        { label: "W4", spend: 44194 },
      ],
      keys: [{ key: "spend", label: "Spend", color: "var(--chart-1)" }],
      chartType: "line",
    },
    {
      id: "g-impr-clicks",
      title: "Impressions vs clicks",
      data: [
        { label: "W1", impressions: 98000, clicks: 4200 },
        { label: "W2", impressions: 102000, clicks: 4500 },
        { label: "W3", impressions: 108000, clicks: 4800 },
        { label: "W4", impressions: 104500, clicks: 4730 },
      ],
      keys: [
        { key: "impressions", label: "Impressions", color: "var(--chart-2)" },
        { key: "clicks", label: "Clicks", color: "var(--chart-3)" },
      ],
      chartType: "area",
    },
    {
      id: "g-ctr",
      title: "CTR trend",
      data: [
        { label: "W1", ctr: 4.1 },
        { label: "W2", ctr: 4.25 },
        { label: "W3", ctr: 4.38 },
        { label: "W4", ctr: 4.42 },
      ],
      keys: [{ key: "ctr", label: "CTR %", color: "var(--chart-4)" }],
      chartType: "line",
    },
    {
      id: "g-conversions",
      title: "Conversions trend",
      data: [
        { label: "W1", conversions: 98 },
        { label: "W2", conversions: 112 },
        { label: "W3", conversions: 128 },
        { label: "W4", conversions: 148 },
      ],
      keys: [{ key: "conversions", label: "Conversions", color: "var(--chart-5)" }],
      chartType: "bar",
    },
    {
      id: "g-cpl",
      title: "Cost per lead trend",
      data: [
        { label: "W1", cpl: 310 },
        { label: "W2", cpl: 302 },
        { label: "W3", cpl: 298 },
        { label: "W4", cpl: 292.58 },
      ],
      keys: [{ key: "cpl", label: "CPL", color: "var(--chart-1)" }],
      chartType: "line",
    },
  ]
}
