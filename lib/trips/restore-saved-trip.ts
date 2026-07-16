import {
  markCurrentTripAsSaved,
  saveTripPlan,
  saveTripRequest,
  setWorkspaceSessionMetadata,
  TRIP_DRAFT_STORAGE_KEY,
  TRIP_ENRICHMENT_STORAGE_KEY,
  TRIP_WEATHER_SUMMARY_STORAGE_KEY,
  type StorageLike,
} from "../trip/storage";
import type { RestoreSavedTripInput } from "./types";

export function restoreSavedTripToStorage(
  input: RestoreSavedTripInput,
  storage?: StorageLike,
) {
  if (!storage && typeof window === "undefined") {
    return;
  }

  const targetStorage = storage ?? window.localStorage;
  const restoredAt = new Date().toISOString();

  saveTripRequest(input.trip.trip_request_json, targetStorage);
  saveTripPlan(input.trip.trip_plan_json, targetStorage);
  targetStorage.removeItem(TRIP_DRAFT_STORAGE_KEY);
  targetStorage.setItem(
    TRIP_ENRICHMENT_STORAGE_KEY,
    JSON.stringify(input.trip.enrichment_json),
  );
  targetStorage.setItem(
    TRIP_WEATHER_SUMMARY_STORAGE_KEY,
    JSON.stringify(input.trip.weather_summary_json),
  );
  markCurrentTripAsSaved(
    {
      savedTripId: input.trip.id,
      savedTripTitle: input.trip.title,
      restoredAt,
    },
    targetStorage,
  );
  setWorkspaceSessionMetadata(
    {
      sourceType: "saved_trip",
      workspaceModeDefault: "read",
      updatedAt: restoredAt,
    },
    targetStorage,
  );
}
