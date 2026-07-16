import type { TripResultEnrichment } from "../trip/enrichment-types";
import type { WorkspaceSessionSourceType } from "../trip/storage";
import type { TripPlan, TripRequest } from "../trip/types";
import type { SaveTripRequestPayload, SavedTripInsert } from "./types";

export function buildSavedTripTitle(
  tripRequest: TripRequest,
  tripPlan: TripPlan,
) {
  const trimmedPlanTitle = tripPlan.tripTitle.trim();

  if (trimmedPlanTitle) {
    return trimmedPlanTitle;
  }

  const trimmedDestination =
    tripRequest.destinationCity.trim() || tripPlan.destination.trim();

  if (trimmedDestination) {
    return `${trimmedDestination} ${tripPlan.days} 天行程`;
  }

  return `旅行计划 ${tripPlan.days} 天`;
}

function resolveWeatherSummary(
  tripPlan: TripPlan,
  tripEnrichment?: TripResultEnrichment | null,
) {
  return tripEnrichment?.weatherSummary ?? tripPlan.weatherSummary;
}

export function mapWorkspaceSourceTypeToTripSourceType(
  sourceType: WorkspaceSessionSourceType | undefined,
) {
  switch (sourceType) {
    case "ai_generated":
      return "ai_generated" as const;
    case "blank_manual":
      return "blank_manual" as const;
    case "explore_import":
      return "explore_import" as const;
    default:
      return undefined;
  }
}

export function buildSavedTripMutation(payload: SaveTripRequestPayload) {
  const { tripRequest, tripPlan, tripEnrichment } = payload;

  return {
    title: buildSavedTripTitle(tripRequest, tripPlan),
    destination_city:
      tripRequest.destinationCity.trim() || tripPlan.destination.trim(),
    start_date: tripRequest.startDate ?? null,
    end_date: tripRequest.endDate ?? null,
    days: tripRequest.days,
    budget: Number.isFinite(tripRequest.budget) ? tripRequest.budget : null,
    trip_request_json: tripRequest,
    trip_plan_json: tripPlan,
    enrichment_json: tripEnrichment?.enrichment ?? null,
    weather_summary_json: resolveWeatherSummary(tripPlan, tripEnrichment),
    ...(payload.saveMetadata?.sourceType
      ? { source_type: payload.saveMetadata.sourceType }
      : {}),
    ...(payload.saveMetadata?.status
      ? { status: payload.saveMetadata.status }
      : {}),
    ...(payload.saveMetadata?.localDraftId !== undefined
      ? { local_draft_id: payload.saveMetadata.localDraftId }
      : {}),
  };
}

export function buildSavedTripInsert(
  userId: string,
  payload: SaveTripRequestPayload,
): SavedTripInsert {
  return {
    user_id: userId,
    ...buildSavedTripMutation(payload),
    source_type: payload.saveMetadata?.sourceType ?? "ai_generated",
    status: payload.saveMetadata?.status ?? "saved",
    trip_preferences_json: {},
    local_draft_id: payload.saveMetadata?.localDraftId ?? null,
    last_opened_at: null,
  };
}
