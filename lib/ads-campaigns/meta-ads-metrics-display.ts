import type {
  AdsCampaign,
  MetaAdsMetricAvailability,
  MetaAdsSummary,
} from "@/lib/ads-campaigns-types";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatMetaAdsPeso(value: number | null | undefined) {
  return pesoFormatter.format(value ?? 0);
}

export function formatMetaAdsNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

export function getMetaCampaignSourceFile(notes: string | null) {
  if (!notes) {
    return null;
  }

  for (const line of notes.split("\n")) {
    if (line.startsWith("Imported from: ")) {
      return line.slice("Imported from: ".length).trim();
    }
  }

  return null;
}

export function getMetaCampaignChartDate(campaign: AdsCampaign) {
  return campaign.endDate ?? campaign.startDate;
}

export function getMetaCampaignMonth(campaign: AdsCampaign) {
  const date = getMetaCampaignChartDate(campaign);
  return date ? date.slice(0, 7) : null;
}

function getDateRangeDays(start: string, end: string) {
  const days: string[] = [];
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  while (current <= endDate) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function getMetaAdsMetricAvailability(
  campaigns: AdsCampaign[],
): MetaAdsMetricAvailability {
  if (campaigns.length === 0) {
    return {
      hasSpend: false,
      hasLeads: false,
      hasRoas: false,
      hasCtr: false,
    };
  }

  return {
    hasSpend: campaigns.some((campaign) => campaign.spend > 0),
    hasLeads: campaigns.some((campaign) => campaign.leads > 0),
    hasRoas: campaigns.some((campaign) => campaign.roas != null),
    hasCtr: campaigns.some((campaign) => campaign.ctr != null),
  };
}

export function summarizeMetaCampaigns(
  campaigns: AdsCampaign[],
): MetaAdsSummary {
  const availability = getMetaAdsMetricAvailability(campaigns);
  const totalSpend = campaigns.reduce(
    (total, campaign) => total + campaign.spend,
    0,
  );
  const totalLeads = campaigns.reduce(
    (total, campaign) => total + campaign.leads,
    0,
  );
  const roasValues = campaigns
    .map((campaign) => campaign.roas)
    .filter((value): value is number => value != null);
  const ctrValues = campaigns
    .map((campaign) => campaign.ctr)
    .filter((value): value is number => value != null);

  const sourceFiles = campaigns
    .map((campaign) => getMetaCampaignSourceFile(campaign.notes))
    .filter((value): value is string => Boolean(value));

  return {
    totalSpend,
    totalLeads,
    avgCpa: totalLeads > 0 ? totalSpend / totalLeads : null,
    avgRoas:
      roasValues.length > 0
        ? roasValues.reduce((total, value) => total + value, 0) /
          roasValues.length
        : null,
    avgCtr:
      ctrValues.length > 0
        ? ctrValues.reduce((total, value) => total + value, 0) /
          ctrValues.length
        : null,
    campaignCount: campaigns.length,
    lastSourceFileName:
      sourceFiles.length > 0 ? sourceFiles[sourceFiles.length - 1] : null,
    availability,
  };
}

export function buildMetaAdsChartData(
  campaigns: AdsCampaign[],
  availability: MetaAdsMetricAvailability,
) {
  const points = new Map<
    string,
    { date: string; spend: number; leads: number; roasTotal: number; roasCount: number }
  >();

  for (const campaign of campaigns) {
    const start = campaign.startDate;
    const end = campaign.endDate ?? campaign.startDate;

    if (!start || !end) {
      continue;
    }

    const days = getDateRangeDays(start, end);

    if (days.length === 0) {
      continue;
    }

    const spendPerDay = campaign.spend / days.length;
    const leadsPerDay = campaign.leads / days.length;

    for (const date of days) {
      const existing = points.get(date) ?? {
        date,
        spend: 0,
        leads: 0,
        roasTotal: 0,
        roasCount: 0,
      };

      existing.spend += spendPerDay;
      existing.leads += leadsPerDay;

      if (campaign.roas != null) {
        existing.roasTotal += campaign.roas;
        existing.roasCount += 1;
      }

      points.set(date, existing);
    }
  }

  return Array.from(points.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((point) => ({
      date: point.date,
      spend: availability.hasSpend ? point.spend : null,
      leads: availability.hasLeads ? point.leads : null,
      roas:
        availability.hasRoas && point.roasCount > 0
          ? point.roasTotal / point.roasCount
          : null,
    }));
}

export type MetaAdsChartMetricKey = "spend" | "leads" | "roas";

export const META_ADS_CHART_METRICS: Array<{
  key: MetaAdsChartMetricKey;
  label: string;
  color: string;
  availabilityKey: keyof MetaAdsMetricAvailability;
}> = [
  {
    key: "spend",
    label: "Spend",
    color: "var(--chart-1)",
    availabilityKey: "hasSpend",
  },
  {
    key: "leads",
    label: "Leads",
    color: "var(--chart-2)",
    availabilityKey: "hasLeads",
  },
  {
    key: "roas",
    label: "ROAS",
    color: "var(--chart-3)",
    availabilityKey: "hasRoas",
  },
];

export function buildMetaAdsChartConfig(
  availability: MetaAdsMetricAvailability,
) {
  return META_ADS_CHART_METRICS.reduce(
    (config, metric) => {
      if (!availability[metric.availabilityKey]) {
        return config;
      }

      config[metric.key] = {
        label: metric.label,
        color: metric.color,
      };

      return config;
    },
    {} as Record<string, { label: string; color: string }>,
  );
}
