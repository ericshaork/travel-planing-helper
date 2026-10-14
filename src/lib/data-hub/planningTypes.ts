import type {
  DataSourceSummary,
  MissingFieldNotice,
  RouteMode,
} from "@/src/server/data-hub/types";

export type BasicRoutePace = "relaxed" | "balanced" | "intense";

export interface BasicRoutePlannerInput {
  destinationId?: string | null;
  dayCount: number;
  candidatePlaceIds: string[];
  pace: BasicRoutePace;
  startPlaceId?: string | null;
  endPlaceId?: string | null;
  transportMode: RouteMode;
  userPreferences?: string[];
}

export interface BasicRouteDraftSlot {
  placeId: string;
  name: string;
  startTime?: string;
  endTime?: string;
  recommendedDurationMinutes: number | null;
  routeFromPrevious?: {
    distanceMeters: number | null;
    durationSeconds: number | null;
    provider: string;
    confidence: number | null;
  } | null;
  reason: string;
  warnings: string[];
  sourceSummary: DataSourceSummary[];
}

export interface BasicRouteDraftDay {
  dayNumber: number;
  title: string;
  slots: BasicRouteDraftSlot[];
  totalTravelTimeSeconds: number;
  missingFields: MissingFieldNotice[];
  feasibilityWarnings: string[];
}

export interface BasicRouteDraftEvidence {
  placeId: string;
  sourceType: string;
  sourceId?: string | null;
  reason: string;
}

export interface BasicRouteUnresolvedPlace {
  placeId: string;
  reason: string;
  missingFields: MissingFieldNotice[];
}

export interface BasicRouteDraft {
  days: BasicRouteDraftDay[];
  unresolved: BasicRouteUnresolvedPlace[];
  evidence: BasicRouteDraftEvidence[];
  missingFields: MissingFieldNotice[];
  warnings: string[];
}
