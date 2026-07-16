export const tripStatusOptions = ["draft", "saved", "archived"] as const;
export const tripSourceTypeOptions = [
  "ai_generated",
  "blank_manual",
  "explore_import",
] as const;

export type TripStatus = (typeof tripStatusOptions)[number];
export type TripSourceType = (typeof tripSourceTypeOptions)[number];

export interface TripsListFilters {
  search?: string;
  status?: TripStatus | "all";
  sourceType?: TripSourceType | "all";
}

const tripStatusLabels: Record<TripStatus, string> = {
  draft: "草稿",
  saved: "已保存",
  archived: "已归档",
};

const tripSourceTypeLabels: Record<TripSourceType, string> = {
  ai_generated: "AI 生成",
  blank_manual: "空白手搓",
  explore_import: "Explore 导入",
};

export function normalizeTripStatus(value: unknown): TripStatus {
  return typeof value === "string" && tripStatusOptions.includes(value as TripStatus)
    ? (value as TripStatus)
    : "saved";
}

export function normalizeTripSourceType(value: unknown): TripSourceType {
  return typeof value === "string" &&
    tripSourceTypeOptions.includes(value as TripSourceType)
    ? (value as TripSourceType)
    : "ai_generated";
}

export function getTripStatusLabel(value: unknown) {
  return tripStatusLabels[normalizeTripStatus(value)];
}

export function getTripSourceTypeLabel(value: unknown) {
  return tripSourceTypeLabels[normalizeTripSourceType(value)];
}

export function buildTripsListQuery(filters?: TripsListFilters) {
  const params = new URLSearchParams();
  const search = filters?.search?.trim();
  const status = filters?.status;
  const sourceType = filters?.sourceType;

  if (search) {
    params.set("search", search);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (sourceType && sourceType !== "all") {
    params.set("source_type", sourceType);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveTripsFilters(filters?: TripsListFilters) {
  return Boolean(
    filters?.search?.trim() ||
      (filters?.status && filters.status !== "all") ||
      (filters?.sourceType && filters.sourceType !== "all"),
  );
}

export function validateSavedTripTitle(value: string) {
  if (!value.trim()) {
    return "标题不能为空。";
  }

  return null;
}
