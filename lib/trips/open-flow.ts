import type { StorageLike } from "../trip/storage";
import type { SavedTripDetail } from "./types";
import { openSavedTrip } from "./open-client";
import { restoreSavedTripToStorage } from "./restore-saved-trip";

interface OpenSavedTripIntoWorkspaceOptions {
  storage?: StorageLike;
  openTrip?: typeof openSavedTrip;
  restoreTrip?: typeof restoreSavedTripToStorage;
  navigate?: (href: string) => void;
}

export async function openSavedTripIntoWorkspace(
  tripId: string,
  options?: OpenSavedTripIntoWorkspaceOptions,
) {
  const openTrip = options?.openTrip ?? openSavedTrip;
  const restoreTrip = options?.restoreTrip ?? restoreSavedTripToStorage;
  const navigate = options?.navigate;

  const trip = (await openTrip(tripId)) as SavedTripDetail;

  restoreTrip({ trip }, options?.storage);
  navigate?.("/result");

  return trip;
}
