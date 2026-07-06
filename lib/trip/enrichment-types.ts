import type { PoiCandidate } from "../poi/types";
import type { RouteLeg } from "../route/types";
import type { TripWeatherSummary } from "../weather/types";
import type { ItineraryItemType } from "./types";
import type { TimeSlotKey } from "./itinerary-view";

export type PaceWarningLevel = "info" | "warning" | "critical";

export type PaceWarningType =
  | "too_many_places"
  | "long_transfer"
  | "high_total_transfer"
  | "unresolved_place"
  | "route_unavailable"
  | "dense_evening"
  | "fallback_estimate";

export interface PaceWarning {
  id: string;
  level: PaceWarningLevel;
  type: PaceWarningType;
  message: string;
  relatedPlaceNames?: string[];
  relatedLegIndex?: number;
}

export interface MapPoint {
  id: string;
  name: string;
  dayIndex: number;
  slot: TimeSlotKey;
  itemIndex: number;
  itemType: ItineraryItemType;
  coordinates?: PoiCandidate["coordinates"];
  address?: string;
  provider?: PoiCandidate["provider"];
  resolved: boolean;
  warning?: string;
}

export interface DayRouteSummary {
  dayIndex: number;
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  legs: RouteLeg[];
  unresolvedPlaces: string[];
  warnings: PaceWarning[];
}

export interface TripEnrichment {
  daySummaries: DayRouteSummary[];
  mapPoints: MapPoint[];
  warnings: PaceWarning[];
}

export interface TripResultEnrichment {
  enrichment: TripEnrichment;
  weatherSummary: TripWeatherSummary;
}

export interface ExtractedPlace {
  name: string;
  dayIndex: number;
  slot: TimeSlotKey;
  itemIndex: number;
  itemType: ItineraryItemType;
}

export interface ExtractedDayPlaces {
  dayIndex: number;
  places: ExtractedPlace[];
}

export interface AnalyzeDayPaceInput {
  dayIndex: number;
  places: Pick<MapPoint, "name" | "slot">[];
  routeLegs: RouteLeg[];
  unresolvedPlaces: string[];
  routeUnavailablePairs?: Array<{
    fromName: string;
    toName: string;
  }>;
  fallbackLegIndices?: number[];
}
