import { formatDate } from "../utils/format";
import type { TripPlan, TripRequest } from "./types";

export type WorkspaceEnrichmentState = "idle" | "loading" | "ready" | "error";

export interface WorkspaceStatusMeta {
  label: string;
  tone: "neutral" | "ready" | "warning";
}

export function formatWorkspaceDateRange(
  tripRequest: TripRequest | null | undefined,
  tripPlan: Pick<TripPlan, "dailyItinerary" | "days">,
): string {
  const startDate =
    tripRequest?.startDate ?? tripPlan.dailyItinerary[0]?.date ?? undefined;
  const endDate =
    tripRequest?.endDate ??
    tripPlan.dailyItinerary[tripPlan.dailyItinerary.length - 1]?.date ??
    undefined;

  if (startDate && endDate) {
    if (startDate === endDate) {
      return formatDate(startDate);
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `${formatDate(startDate)} 出发`;
  }

  if (endDate) {
    return `${formatDate(endDate)} 结束`;
  }

  return `${tripPlan.days} 天，日期待确认`;
}

export function getWorkspaceEnrichmentStatusMeta(
  state: WorkspaceEnrichmentState,
): WorkspaceStatusMeta {
  if (state === "ready") {
    return {
      label: "路线洞察已加载",
      tone: "ready",
    };
  }

  if (state === "error") {
    return {
      label: "路线洞察暂不可用",
      tone: "warning",
    };
  }

  if (state === "loading") {
    return {
      label: "路线洞察整理中",
      tone: "neutral",
    };
  }

  return {
    label: "等待路线洞察",
    tone: "neutral",
  };
}
