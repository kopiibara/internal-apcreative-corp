export type MetaAdsCampaignCsvPreview = {
  templateLabel: string;
  detectedColumns: string[];
  rowCount: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
};

export type ParsedMetaAdsCampaign = {
  campaignName: string;
  objective: string;
  spend: number;
  leads: number;
  ctr: number | null;
  roas: number | null;
  status: "ACTIVE" | "PAUSED" | "ENDED" | "MISSING";
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => item.trim()));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function cleanNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const cleaned = value
    .replace(/[₱,%"]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned || cleaned === "—" || cleaned === "-") {
    return 0;
  }

  const numberValue = Number(cleaned);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanOptionalNumber(value: string | undefined) {
  const numberValue = cleanNumber(value);
  return numberValue > 0 ? numberValue : null;
}

function getCell(
  row: string[],
  headerIndex: Map<string, number>,
  header: string,
) {
  const index = headerIndex.get(normalizeHeader(header));
  return index == null ? "" : (row[index]?.trim() ?? "");
}

function mapMetaStatus(value: string): ParsedMetaAdsCampaign["status"] {
  const normalized = value.trim().toLowerCase();

  if (normalized === "active") {
    return "ACTIVE";
  }

  if (normalized === "completed") {
    return "ENDED";
  }

  if (normalized === "inactive" || normalized === "paused") {
    return "PAUSED";
  }

  return "MISSING";
}

function inferObjective(resultIndicator: string, campaignName: string) {
  const source = `${resultIndicator} ${campaignName}`.toLowerCase();

  if (source.includes("messaging")) {
    return "Messaging";
  }

  if (source.includes("landing_page_view")) {
    return "Traffic";
  }

  if (source.includes("reach")) {
    return "Awareness";
  }

  if (source.includes("purchase")) {
    return "Sales";
  }

  return "Lead Gen";
}

export function previewMetaAdsCampaignCsv(
  csvText: string,
): MetaAdsCampaignCsvPreview {
  const rows = parseCsvRows(csvText);
  const headers = rows[0] ?? [];
  const detectedColumns = headers
    .map((header) => header.trim())
    .filter(Boolean);

  const requiredColumns = [
    "Reporting starts",
    "Reporting ends",
    "Campaign name",
    "Campaign delivery",
    "Amount spent (PHP)",
  ];

  const normalizedHeaders = new Set(detectedColumns.map(normalizeHeader));
  const missingColumns = requiredColumns.filter(
    (column) => !normalizedHeaders.has(normalizeHeader(column)),
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `This is not a supported Meta Ads campaign CSV. Missing columns: ${missingColumns.join(
        ", ",
      )}`,
    );
  }

  const dataRows = rows.slice(1);
  const dateStarts = dataRows.map((row) => row[0]).filter(Boolean);
  const dateEnds = dataRows.map((row) => row[1]).filter(Boolean);

  return {
    templateLabel: "Meta Ads Campaign Export",
    detectedColumns,
    rowCount: dataRows.length,
    dateRange:
      dateStarts.length > 0 && dateEnds.length > 0
        ? {
            start: dateStarts[0],
            end: dateEnds[dateEnds.length - 1],
          }
        : null,
  };
}

export function parseMetaAdsCampaignCsv(
  csvText: string,
): ParsedMetaAdsCampaign[] {
  const rows = parseCsvRows(csvText);
  const headers = rows[0] ?? [];
  const headerIndex = new Map(
    headers.map((header, index) => [normalizeHeader(header), index]),
  );

  previewMetaAdsCampaignCsv(csvText);

  return rows
    .slice(1)
    .map((row) => {
      const campaignName = getCell(row, headerIndex, "Campaign name");
      const delivery = getCell(row, headerIndex, "Campaign delivery");
      const resultIndicator = getCell(row, headerIndex, "Result indicator");

      const messagingContacts =
        cleanNumber(getCell(row, headerIndex, "Total messaging contacts")) ||
        cleanNumber(
          getCell(row, headerIndex, "Messaging conversations started"),
        ) ||
        cleanNumber(getCell(row, headerIndex, "Results"));

      return {
        campaignName,
        objective: inferObjective(resultIndicator, campaignName),
        spend: cleanNumber(getCell(row, headerIndex, "Amount spent (PHP)")),
        leads: Math.round(messagingContacts),
        ctr: null,
        roas: cleanOptionalNumber(
          getCell(row, headerIndex, "Purchase ROAS (return on ad spend)"),
        ),
        status: mapMetaStatus(delivery),
        startDate: getCell(row, headerIndex, "Reporting starts") || null,
        endDate: getCell(row, headerIndex, "Reporting ends") || null,
        notes: resultIndicator
          ? `Meta result indicator: ${resultIndicator}`
          : null,
      };
    })
    .filter((campaign) => campaign.campaignName.trim());
}
