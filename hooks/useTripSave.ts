import { useState } from "react";

import {
  markWorkspaceProjectDraft,
  touchWorkspaceProjectContext,
} from "@/lib/projects/workspace-context-client";
import { saveTripPlan } from "@/lib/trip/storage";
import type { GenerateTripResponse, TripPlan } from "@/lib/trip/types";

interface UseTripSaveResult {
  currentTripPlan: TripPlan;
  persistTripPlan: (nextTripPlan: TripPlan) => TripPlan;
  applyRegeneratedTrip: (response: GenerateTripResponse) => TripPlan;
}

export function useTripSave(initialTripPlan: TripPlan): UseTripSaveResult {
  const [persistedState, setPersistedState] = useState(() => ({
    sourceTripPlan: initialTripPlan,
    currentTripPlan: initialTripPlan,
  }));
  const currentTripPlan =
    persistedState.sourceTripPlan === initialTripPlan
      ? persistedState.currentTripPlan
      : initialTripPlan;

  function persistTripPlan(nextTripPlan: TripPlan) {
    const savedTripPlan = saveTripPlan(nextTripPlan);
    touchWorkspaceProjectContext();
    markWorkspaceProjectDraft();
    setPersistedState({
      sourceTripPlan: initialTripPlan,
      currentTripPlan: savedTripPlan,
    });
    return savedTripPlan;
  }

  function applyRegeneratedTrip(response: GenerateTripResponse) {
    return persistTripPlan(response.tripPlan);
  }

  return {
    currentTripPlan,
    persistTripPlan,
    applyRegeneratedTrip,
  };
}
