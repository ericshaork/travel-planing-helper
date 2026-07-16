import type { SavedTripListItem } from "./types";

function isNonEmptyText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function formatSavedTripDateRange(
  trip: Pick<SavedTripListItem, "start_date" | "end_date">,
) {
  if (isNonEmptyText(trip.start_date) && isNonEmptyText(trip.end_date)) {
    return `${trip.start_date} - ${trip.end_date}`;
  }

  if (isNonEmptyText(trip.start_date)) {
    return `${trip.start_date} 出发`;
  }

  if (isNonEmptyText(trip.end_date)) {
    return `至 ${trip.end_date}`;
  }

  return "日期待确认";
}

export function formatSavedTripDays(days: number | null) {
  return typeof days === "number" && Number.isFinite(days)
    ? `${days} 天`
    : "天数待确认";
}

export function formatSavedTripBudget(budget: number | null) {
  return typeof budget === "number" && Number.isFinite(budget)
    ? `预算 ¥${budget}`
    : "预算待补充";
}

export function formatSavedTripUpdatedAt(updatedAt: string) {
  const normalized = updatedAt.trim();

  if (!normalized) {
    return "最近更新时间待确认";
  }

  return normalized.replace("T", " ").slice(0, 16);
}

export function formatSavedTripLastOpenedAt(lastOpenedAt: string | null) {
  if (!lastOpenedAt || !lastOpenedAt.trim()) {
    return "尚未打开";
  }

  return lastOpenedAt.trim().replace("T", " ").slice(0, 16);
}
