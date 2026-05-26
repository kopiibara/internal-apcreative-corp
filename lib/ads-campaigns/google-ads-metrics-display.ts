import type {
  GoogleAdsMetric,
  GoogleAdsMetricAvailability,
  GoogleAdsSummary,
} from "@/lib/ads-campaigns-types";
import { GOOGLE_ADS_TEMPLATE } from "@/lib/ads-campaigns/google-ads-csv-parser";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatGoogleAdsPeso(value: number | null | undefined) {
  return pesoFormatter.format(value ?? 0);
}

export function formatGoogleAdsNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

export function getGoogleAdsMetricAvailability(
  metrics: GoogleAdsMetric[],
): GoogleAdsMetricAvailability {
  if (metrics.length === 0) {
    return {
      hasImpressions: false,
      hasAvgTargetCpa: false,
      hasConversions: false,
      hasCost: false,
      hasConversionValue: false,
      hasConversionValuePerClick: false,
    };
  }

  const templates = new Set(
    metrics
      .map((metric) => metric.importTemplate)
      .filter((value): value is string => Boolean(value)),
  );

  const hasTemplate1 = templates.has(
    GOOGLE_ADS_TEMPLATE.IMPRESSIONS_CPA_CONVERSIONS_COST,
  );
  const hasTemplate2 = templates.has(GOOGLE_ADS_TEMPLATE.CONVERSION_VALUE_COST);

  return {
    hasImpressions:
      hasTemplate1 ||
      metrics.some((metric) => metric.impressions > 0),
    hasAvgTargetCpa:
      hasTemplate1 ||
      metrics.some((metric) => metric.avgTargetCpa != null),
    hasConversions:
      hasTemplate1 ||
      hasTemplate2 ||
      templates.has(GOOGLE_ADS_TEMPLATE.CUSTOM) ||
      metrics.some((metric) => metric.conversions > 0),
    hasCost:
      hasTemplate1 ||
      hasTemplate2 ||
      templates.has(GOOGLE_ADS_TEMPLATE.CUSTOM) ||
      metrics.length > 0,
    hasConversionValue:
      hasTemplate2 ||
      metrics.some((metric) => metric.conversionValue != null),
    hasConversionValuePerClick:
      hasTemplate2 ||
      metrics.some((metric) => metric.conversionValuePerClick != null),
  };
}

export function summarizeGoogleAdsMetrics(
  metrics: GoogleAdsMetric[],
): GoogleAdsSummary {
  const availability = getGoogleAdsMetricAvailability(metrics);
  const totalCost = metrics.reduce((total, metric) => total + metric.cost, 0);
  const totalConversions = metrics.reduce(
    (total, metric) => total + metric.conversions,
    0,
  );
  const totalImpressions = availability.hasImpressions
    ? metrics.reduce((total, metric) => total + metric.impressions, 0)
    : null;
  const totalConversionValue = availability.hasConversionValue
    ? metrics.reduce(
        (total, metric) => total + (metric.conversionValue ?? 0),
        0,
      )
    : null;
  const avgTargetCpaValues = metrics
    .map((metric) => metric.avgTargetCpa)
    .filter((value): value is number => value != null);
  const conversionValuePerClickValues = metrics
    .map((metric) => metric.conversionValuePerClick)
    .filter((value): value is number => value != null);

  return {
    totalCost,
    totalImpressions,
    totalConversions,
    totalConversionValue,
    avgCpa: totalConversions > 0 ? totalCost / totalConversions : null,
    avgTargetCpa:
      availability.hasAvgTargetCpa && avgTargetCpaValues.length > 0
        ? avgTargetCpaValues.reduce((total, value) => total + value, 0) /
          avgTargetCpaValues.length
        : null,
    avgConversionValuePerClick:
      availability.hasConversionValuePerClick &&
      conversionValuePerClickValues.length > 0
        ? conversionValuePerClickValues.reduce(
            (total, value) => total + value,
            0,
          ) / conversionValuePerClickValues.length
        : null,
    lastImportedAt: null,
    lastSourceFileName: null,
    lastImportTemplate: null,
    availability,
  };
}

export function buildGoogleAdsChartData(
  metrics: GoogleAdsMetric[],
  availability: GoogleAdsMetricAvailability,
) {
  return metrics.map((metric) => ({
    date: metric.metricDate,
    impressions: availability.hasImpressions ? metric.impressions : null,
    cost: availability.hasCost ? metric.cost : null,
    conversions: availability.hasConversions ? metric.conversions : null,
    avgTargetCpa: availability.hasAvgTargetCpa
      ? metric.avgTargetCpa
      : null,
    conversionValue: availability.hasConversionValue
      ? metric.conversionValue
      : null,
    conversionValuePerClick: availability.hasConversionValuePerClick
      ? metric.conversionValuePerClick
      : null,
  }));
}

export type GoogleAdsChartMetricKey =
  | "impressions"
  | "cost"
  | "conversions"
  | "avgTargetCpa"
  | "conversionValue"
  | "conversionValuePerClick";

export const GOOGLE_ADS_CHART_METRICS: Array<{
  key: GoogleAdsChartMetricKey;
  label: string;
  color: string;
  availabilityKey: keyof GoogleAdsMetricAvailability;
}> = [
  {
    key: "impressions",
    label: "Impressions",
    color: "var(--chart-1)",
    availabilityKey: "hasImpressions",
  },
  {
    key: "cost",
    label: "Cost",
    color: "var(--chart-2)",
    availabilityKey: "hasCost",
  },
  {
    key: "conversions",
    label: "Conversions",
    color: "var(--chart-3)",
    availabilityKey: "hasConversions",
  },
  {
    key: "avgTargetCpa",
    label: "Avg. Target CPA",
    color: "var(--chart-4)",
    availabilityKey: "hasAvgTargetCpa",
  },
  {
    key: "conversionValue",
    label: "Conversion Value",
    color: "var(--chart-5)",
    availabilityKey: "hasConversionValue",
  },
  {
    key: "conversionValuePerClick",
    label: "Conv. Value / Click",
    color: "var(--chart-6)",
    availabilityKey: "hasConversionValuePerClick",
  },
];

export function buildGoogleAdsChartConfig(
  availability: GoogleAdsMetricAvailability,
) {
  return GOOGLE_ADS_CHART_METRICS.reduce(
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
