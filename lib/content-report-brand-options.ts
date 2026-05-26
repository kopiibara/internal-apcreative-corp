export type ContentReportBrandOption = {
  id: number;
  name: string;
  isPrimary: boolean;
};

export function mergeContentReportBrandOptions(
  brandOptions: ContentReportBrandOption[],
  report?: { brandId: number | null; brandName: string | null } | null,
) {
  if (
    report?.brandId == null ||
    brandOptions.some((brand) => brand.id === report.brandId)
  ) {
    return brandOptions;
  }

  return [
    ...brandOptions,
    {
      id: report.brandId,
      name: report.brandName ?? `Brand #${report.brandId}`,
      isPrimary: false,
    },
  ];
}
