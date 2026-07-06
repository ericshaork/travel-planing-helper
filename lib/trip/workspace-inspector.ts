import type { RouteLeg } from "../route/types";
import type { DayRouteInsight } from "./route-insight";

export interface WorkspaceInsightStats {
  resolvedPoints: number;
  unresolvedPoints: number;
  totalDistanceMeters: number;
  totalDurationMinutes: number;
}

export function formatRouteDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

export function formatRouteDuration(durationMinutes: number): string {
  if (durationMinutes >= 60) {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return `${hours} 小时`;
    }

    return `${hours} 小时 ${minutes} 分钟`;
  }

  return `${durationMinutes} 分钟`;
}

export function buildWorkspaceInsightStats(
  insight?: DayRouteInsight,
): WorkspaceInsightStats {
  const resolvedPoints =
    insight?.mapPoints.filter((point) => point.resolved).length ?? 0;
  const unresolvedPoints = (insight?.mapPoints.length ?? 0) - resolvedPoints;

  return {
    resolvedPoints,
    unresolvedPoints,
    totalDistanceMeters: insight?.routeSummary?.totalDistanceMeters ?? 0,
    totalDurationMinutes: insight?.routeSummary?.totalDurationMinutes ?? 0,
  };
}

export function isFallbackLeg(leg: RouteLeg): boolean {
  return leg.provider === "mock";
}
