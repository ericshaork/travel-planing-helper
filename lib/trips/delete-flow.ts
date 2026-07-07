import type { StorageLike } from "../trip/storage";
import {
  clearSavedTripMetadata,
  getSavedTripMetadata,
} from "../trip/storage";
import { deleteSavedTripFromCloud } from "./delete-client";

interface DeleteSavedTripFlowOptions {
  storage?: StorageLike;
  deleteTrip?: typeof deleteSavedTripFromCloud;
  getMetadata?: typeof getSavedTripMetadata;
  clearMetadata?: typeof clearSavedTripMetadata;
}

export async function deleteSavedTrip(
  tripId: string,
  options?: DeleteSavedTripFlowOptions,
) {
  const storage = options?.storage;
  const deleteTrip = options?.deleteTrip ?? deleteSavedTripFromCloud;
  const getMetadata = options?.getMetadata ?? getSavedTripMetadata;
  const clearMetadata = options?.clearMetadata ?? clearSavedTripMetadata;
  const metadata = getMetadata(storage);

  await deleteTrip(tripId);

  if (metadata?.savedTripId === tripId) {
    clearMetadata(storage);
  }
}
