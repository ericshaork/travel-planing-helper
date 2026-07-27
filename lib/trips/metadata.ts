export const tripStatusOptions = ["draft", "saved", "archived"] as const;
export const tripSourceTypeOptions = [
  "ai_generated",
  "blank_manual",
  "explore_import",
  "file_import",
] as const;
export const projectLifecycleStateOptions = [
  "new",
  "exploring",
  "planning",
  "proposed",
  "generating",
  "workspace",
  "editing",
  "archived",
] as const;

export type TripStatus = (typeof tripStatusOptions)[number];
export type TripSourceType = (typeof tripSourceTypeOptions)[number];
export type ProjectLifecycleState = (typeof projectLifecycleStateOptions)[number];

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
  blank_manual: "空白手动",
  explore_import: "Explore 导入",
  file_import: "文件导入",
};

const projectLifecycleLabels: Record<ProjectLifecycleState, string> = {
  new: "新建",
  exploring: "选来源中",
  planning: "AI 规划中",
  proposed: "方案已提案",
  generating: "生成中",
  workspace: "已进 Workspace",
  editing: "编辑中",
  archived: "已归档",
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

export function getProjectLifecycleLabel(value: unknown) {
  return typeof value === "string" &&
    projectLifecycleStateOptions.includes(value as ProjectLifecycleState)
    ? projectLifecycleLabels[value as ProjectLifecycleState]
    : projectLifecycleLabels.workspace;
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
