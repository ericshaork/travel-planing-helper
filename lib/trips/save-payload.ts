import type { TripResultEnrichment } from "../trip/enrichment-types";
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
  };
}

export function buildSavedTripInsert(
  userId: string,
  payload: SaveTripRequestPayload,
): SavedTripInsert {
  return {
    user_id: userId,
    ...buildSavedTripMutation(payload),
  };
}
