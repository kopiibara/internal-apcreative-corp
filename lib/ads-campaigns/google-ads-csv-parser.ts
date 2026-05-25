export const GOOGLE_ADS_TEMPLATE = {
  IMPRESSIONS_CPA_CONVERSIONS_COST: "GOOGLE_ADS_IMPRESSIONS_CPA_CONVERSIONS_COST",
  CONVERSION_VALUE_COST: "GOOGLE_ADS_CONVERSION_VALUE_COST",
  CUSTOM: "GOOGLE_ADS_CUSTOM",
} as const;

export type GoogleAdsImportTemplate =
  (typeof GOOGLE_ADS_TEMPLATE)[keyof typeof GOOGLE_ADS_TEMPLATE];

export const GOOGLE_ADS_TEMPLATE_LABELS: Record<GoogleAdsImportTemplate, string> = {
  [GOOGLE_ADS_TEMPLATE.IMPRESSIONS_CPA_CONVERSIONS_COST]:
    "Date + Impressions + Avg. Target CPA + Conversions + Cost",
  [GOOGLE_ADS_TEMPLATE.CONVERSION_VALUE_COST]:
    "Date + Conversions + Conversion Value + Conversion Value / Click + Cost",
  [GOOGLE_ADS_TEMPLATE.CUSTOM]: "Date + supported Google Ads metrics",
};

export const GOOGLE_ADS_UNSUPPORTED_LAYOUT_MESSAGE =
  "This CSV layout is not supported yet. Please export a report with Date and at least one supported metric such as Cost, Impressions, Conversions, or Conv. value.";

export const GOOGLE_ADS_MAX_CSV_ROWS = 500;
export const GOOGLE_ADS_MAX_CSV_BYTES = 2 * 1024 * 1024;

export type ParsedGoogleAdsMetricRow = {
  metricDate: string;
  impressions: number;
  avgTargetCpa: number | null;
  conversions: number;
  cost: number;
  conversionValue: number | null;
  conversionValuePerClick: number | null;
  sourceTemplate: GoogleAdsImportTemplate;
  rawMetrics: Record<string, string | number | null>;
};

export type GoogleAdsCsvColumnMap = {
  date: number | null;
  impressions: number | null;
  avgTargetCpa: number | null;
  conversions: number | null;
  cost: number | null;
  conversionValue: number | null;
  conversionValuePerClick: number | null;
};

export type GoogleAdsCsvParseResult = {
  sourceTemplate: GoogleAdsImportTemplate;
  templateLabel: string;
  detectedColumns: string[];
  columnMap: GoogleAdsCsvColumnMap;
  missingOptionalMetrics: string[];
  rows: ParsedGoogleAdsMetricRow[];
  rowCount: number;
  dateRange: { start: string; end: string } | null;
};

type ColumnDefinition = {
  field: keyof GoogleAdsCsvColumnMap;
  label: string;
  aliases: string[];
};

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { field: "date", label: "Date", aliases: ["date"] },
  {
    field: "impressions",
    label: "Impressions",
    aliases: ["impr", "impr.", "impressions"],
  },
  {
    field: "avgTargetCpa",
    label: "Avg. Target CPA",
    aliases: [
      "avg. target cpa",
      "avg target cpa",
      "average target cpa",
      "avg. target cpa (currency)",
    ],
  },
  {
    field: "conversions",
    label: "Conversions",
    aliases: ["conversions", "conversion"],
  },
  {
    field: "conversionValue",
    label: "Conversion Value",
    aliases: ["conv. value", "conversion value", "conv value"],
  },
  {
    field: "conversionValuePerClick",
    label: "Conversion Value / Click",
    aliases: [
      "conv. value / click",
      "conv value / click",
      "conversion value / click",
      "conv. value/click",
    ],
  },
  { field: "cost", label: "Cost", aliases: ["cost"] },
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "");
}

export function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function isDashValue(value: string) {
  const normalized = value.trim();
  return !normalized || normalized === "—" || normalized === "-";
}

export function parseCurrency(value: string, nullable = false) {
  const normalized = value.trim();

  if (isDashValue(normalized)) {
    return nullable ? null : 0;
  }

  const numeric = Number(normalized.replace(/[₱$,\s%]/g, ""));

  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid currency value: ${value}`);
  }

  return numeric;
}

export function parseNumberCell(
  value: string,
  columnName: string,
  options?: { nullable?: boolean; defaultValue?: number },
) {
  const normalized = value.trim();

  if (isDashValue(normalized)) {
    if (options?.nullable) {
      return null;
    }

    return options?.defaultValue ?? 0;
  }

  const withoutPercent = normalized.endsWith("%")
    ? normalized.slice(0, -1)
    : normalized;
  const numeric = Number(withoutPercent.replace(/,/g, ""));

  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid ${columnName} value: ${value}`);
  }

  return numeric;
}

export function parseGoogleAdsDate(value: string) {
  const normalized = value.trim();

  if (!normalized || isDashValue(normalized)) {
    throw new Error("Date is required for each CSV row.");
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Date value: ${value}`);
  }

  return parsed.toISOString().slice(0, 10);
}

function resolveColumnMap(headers: string[]): {
  columnMap: GoogleAdsCsvColumnMap;
  detectedColumns: string[];
} {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const columnMap: GoogleAdsCsvColumnMap = {
    date: null,
    impressions: null,
    avgTargetCpa: null,
    conversions: null,
    cost: null,
    conversionValue: null,
    conversionValuePerClick: null,
  };
  const detectedColumns: string[] = [];

  for (const definition of COLUMN_DEFINITIONS) {
    const index = normalizedHeaders.findIndex((header) =>
      definition.aliases.includes(header),
    );

    if (index >= 0) {
      columnMap[definition.field] = index;
      detectedColumns.push(headers[index]?.trim() || definition.label);
    }
  }

  return { columnMap, detectedColumns };
}

function detectTemplate(columnMap: GoogleAdsCsvColumnMap): {
  sourceTemplate: GoogleAdsImportTemplate;
  missingOptionalMetrics: string[];
} {
  if (columnMap.date == null) {
    throw new Error("CSV is missing required column: Date");
  }

  const has = {
    impressions: columnMap.impressions != null,
    avgTargetCpa: columnMap.avgTargetCpa != null,
    conversions: columnMap.conversions != null,
    cost: columnMap.cost != null,
    conversionValue: columnMap.conversionValue != null,
    conversionValuePerClick: columnMap.conversionValuePerClick != null,
  };

  const recognizedMetricCount = [
    has.impressions,
    has.avgTargetCpa,
    has.conversions,
    has.cost,
    has.conversionValue,
    has.conversionValuePerClick,
  ].filter(Boolean).length;

  if (recognizedMetricCount === 0) {
    throw new Error(GOOGLE_ADS_UNSUPPORTED_LAYOUT_MESSAGE);
  }

  if (
    has.impressions &&
    has.avgTargetCpa &&
    has.conversions &&
    has.cost &&
    !has.conversionValue &&
    !has.conversionValuePerClick
  ) {
    return {
      sourceTemplate: GOOGLE_ADS_TEMPLATE.IMPRESSIONS_CPA_CONVERSIONS_COST,
      missingOptionalMetrics: [],
    };
  }

  if (
    has.conversions &&
    has.cost &&
    (has.conversionValue || has.conversionValuePerClick) &&
    !has.impressions &&
    !has.avgTargetCpa
  ) {
    const missingOptionalMetrics: string[] = [];

    if (!has.conversionValue) {
      missingOptionalMetrics.push("Conversion Value");
    }

    if (!has.conversionValuePerClick) {
      missingOptionalMetrics.push("Conversion Value / Click");
    }

    return {
      sourceTemplate: GOOGLE_ADS_TEMPLATE.CONVERSION_VALUE_COST,
      missingOptionalMetrics,
    };
  }

  if (has.cost || has.conversions || has.impressions || has.conversionValue) {
    const optionalMetricLabels = [
      "Impressions",
      "Avg. Target CPA",
      "Conversions",
      "Cost",
      "Conversion Value",
      "Conversion Value / Click",
    ] as const;
    const missingOptionalMetrics = optionalMetricLabels.filter((label) => {
      if (label === "Impressions") return !has.impressions;
      if (label === "Avg. Target CPA") return !has.avgTargetCpa;
      if (label === "Conversions") return !has.conversions;
      if (label === "Cost") return !has.cost;
      if (label === "Conversion Value") return !has.conversionValue;
      if (label === "Conversion Value / Click") {
        return !has.conversionValuePerClick;
      }

      return false;
    });

    return {
      sourceTemplate: GOOGLE_ADS_TEMPLATE.CUSTOM,
      missingOptionalMetrics,
    };
  }

  throw new Error(GOOGLE_ADS_UNSUPPORTED_LAYOUT_MESSAGE);
}

function buildRawMetrics(
  cells: string[],
  headers: string[],
  columnMap: GoogleAdsCsvColumnMap,
) {
  const rawMetrics: Record<string, string | number | null> = {};
  const mappedIndexes = new Set(
    Object.values(columnMap).filter((index): index is number => index != null),
  );

  headers.forEach((header, index) => {
    if (mappedIndexes.has(index)) {
      return;
    }

    const value = cells[index] ?? "";

    if (!header.trim() || isDashValue(value)) {
      return;
    }

    const numeric = Number(value.replace(/[₱$,\s%]/g, ""));

    rawMetrics[header.trim()] = Number.isNaN(numeric) ? value.trim() : numeric;
  });

  return rawMetrics;
}

function normalizeRow(
  cells: string[],
  headers: string[],
  columnMap: GoogleAdsCsvColumnMap,
  sourceTemplate: GoogleAdsImportTemplate,
): ParsedGoogleAdsMetricRow {
  const getCell = (index: number | null) =>
    index == null ? "" : (cells[index] ?? "");

  const metricDate = parseGoogleAdsDate(getCell(columnMap.date));
  const impressions =
    columnMap.impressions == null
      ? 0
      : (parseNumberCell(getCell(columnMap.impressions), "Impressions", {
          defaultValue: 0,
        }) ?? 0);
  const avgTargetCpa =
    columnMap.avgTargetCpa == null
      ? null
      : parseCurrency(getCell(columnMap.avgTargetCpa), true);
  const conversions =
    columnMap.conversions == null
      ? 0
      : (parseNumberCell(getCell(columnMap.conversions), "Conversions", {
          defaultValue: 0,
        }) ?? 0);
  const cost =
    columnMap.cost == null
      ? 0
      : (parseCurrency(getCell(columnMap.cost)) ?? 0);
  const conversionValue =
    columnMap.conversionValue == null
      ? null
      : parseCurrency(getCell(columnMap.conversionValue), true);
  const conversionValuePerClick =
    columnMap.conversionValuePerClick == null
      ? null
      : parseCurrency(getCell(columnMap.conversionValuePerClick), true);

  return {
    metricDate,
    impressions,
    avgTargetCpa,
    conversions,
    cost,
    conversionValue,
    conversionValuePerClick,
    sourceTemplate,
    rawMetrics: buildRawMetrics(cells, headers, columnMap),
  };
}

export function parseGoogleAdsCsv(csvText: string): GoogleAdsCsvParseResult {
  if (csvText.length > GOOGLE_ADS_MAX_CSV_BYTES) {
    throw new Error("CSV file is too large. Maximum size is 2 MB.");
  }

  const rows = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  if (rows.length - 1 > GOOGLE_ADS_MAX_CSV_ROWS) {
    throw new Error(
      `CSV exceeds the ${GOOGLE_ADS_MAX_CSV_ROWS} row import limit.`,
    );
  }

  const headers = splitCsvLine(rows[0]);
  const { columnMap, detectedColumns } = resolveColumnMap(headers);
  const { sourceTemplate, missingOptionalMetrics } = detectTemplate(columnMap);
  const parsedRows: ParsedGoogleAdsMetricRow[] = [];

  for (const line of rows.slice(1)) {
    const cells = splitCsvLine(line);

    if (cells.every((cell) => !cell.trim())) {
      continue;
    }

    parsedRows.push(
      normalizeRow(cells, headers, columnMap, sourceTemplate),
    );
  }

  if (parsedRows.length === 0) {
    throw new Error("CSV did not contain any importable rows.");
  }

  const dates = parsedRows.map((row) => row.metricDate).sort();

  return {
    sourceTemplate,
    templateLabel: GOOGLE_ADS_TEMPLATE_LABELS[sourceTemplate],
    detectedColumns,
    columnMap,
    missingOptionalMetrics,
    rows: parsedRows,
    rowCount: parsedRows.length,
    dateRange: {
      start: dates[0] ?? "",
      end: dates[dates.length - 1] ?? "",
    },
  };
}

export function previewGoogleAdsCsv(csvText: string) {
  const parsed = parseGoogleAdsCsv(csvText);

  return {
    sourceTemplate: parsed.sourceTemplate,
    templateLabel: parsed.templateLabel,
    detectedColumns: parsed.detectedColumns,
    missingOptionalMetrics: parsed.missingOptionalMetrics,
    rowCount: parsed.rowCount,
    dateRange: parsed.dateRange,
  };
}
