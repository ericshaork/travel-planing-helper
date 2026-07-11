"use client";

import type { TripResultEnrichment } from "@/lib/trip/enrichment-types";
import type { TripPlan, TripRequest } from "@/lib/trip/types";

import { SaveCurrentTripButton } from "../trips/SaveCurrentTripButton";

interface SaveStatusProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
  tripEnrichment?: TripResultEnrichment | null;
}

export function SaveStatus({
  tripPlan,
  tripRequest,
  tripEnrichment = null,
}: SaveStatusProps) {
  return (
    <SaveCurrentTripButton
      key={[
        tripPlan.tripTitle,
        tripPlan.summary,
        tripRequest?.destinationCity ?? "",
        tripRequest?.startDate ?? "",
        tripRequest?.endDate ?? "",
        tripRequest?.budget ?? "",
      ].join("|")}
      tripPlan={tripPlan}
      tripRequest={tripRequest}
      tripEnrichment={tripEnrichment}
    />
  );
}
