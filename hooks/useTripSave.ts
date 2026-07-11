import { useState } from "react";

import { saveTripPlan } from "@/lib/trip/storage";
import type { GenerateTripResponse, TripPlan } from "@/lib/trip/types";

interface UseTripSaveResult {
  currentTripPlan: TripPlan;
  persistTripPlan: (nextTripPlan: TripPlan) => TripPlan;
  applyRegeneratedTrip: (response: GenerateTripResponse) => TripPlan;
}

export function useTripSave(initialTripPlan: TripPlan): UseTripSaveResult {
  const [currentTripPlan, setCurrentTripPlan] = useState(initialTripPlan);

  function persistTripPlan(nextTripPlan: TripPlan) {
    const savedTripPlan = saveTripPlan(nextTripPlan);
    setCurrentTripPlan(savedTripPlan);
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
