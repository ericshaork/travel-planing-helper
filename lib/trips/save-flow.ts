import type { StorageLike } from "../trip/storage";
import {
  getSavedTripMetadata,
  markCurrentTripAsSaved,
} from "../trip/storage";
import { buildSavedTripTitle } from "./save-payload";
import { saveTripToCloud } from "./save-client";
import type { SaveTripRequestPayload } from "./types";
import { updateSavedTripInCloud } from "./update-client";

interface PersistCurrentTripOptions {
  storage?: StorageLike;
  createTrip?: typeof saveTripToCloud;
  updateTrip?: typeof updateSavedTripInCloud;
  getMetadata?: typeof getSavedTripMetadata;
  markSaved?: typeof markCurrentTripAsSaved;
}

export async function persistCurrentTrip(
  payload: SaveTripRequestPayload,
  options?: PersistCurrentTripOptions,
) {
  const storage = options?.storage;
  const createTrip = options?.createTrip ?? saveTripToCloud;
  const updateTrip = options?.updateTrip ?? updateSavedTripInCloud;
  const getMetadata = options?.getMetadata ?? getSavedTripMetadata;
  const markSaved = options?.markSaved ?? markCurrentTripAsSaved;
  const currentMetadata = getMetadata(storage);
  const savedTripTitle = buildSavedTripTitle(payload.tripRequest, payload.tripPlan);

  if (currentMetadata?.savedTripId) {
    const response = await updateTrip(currentMetadata.savedTripId, payload);

    markSaved(
      {
        savedTripId: response.tripId,
        savedTripTitle,
        restoredAt: currentMetadata.restoredAt,
        savedAt: response.updatedAt,
      },
      storage,
    );

    return {
      mode: "updated" as const,
      tripId: response.tripId,
      savedTripTitle,
      updatedAt: response.updatedAt,
    };
  }

  const response = await createTrip(payload);

  markSaved(
    {
      savedTripId: response.tripId,
      savedTripTitle,
    },
    storage,
  );

  return {
    mode: "created" as const,
    tripId: response.tripId,
    savedTripTitle,
  };
}
