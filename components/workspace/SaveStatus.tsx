"use client";

import { useEffect, useState } from "react";

import type { TripResultEnrichment } from "@/lib/trip/enrichment-types";
import type { TripPlan, TripRequest } from "@/lib/trip/types";
import { getProjectSession } from "@/lib/projects/session";

import { SaveCurrentTripButton } from "../trips/SaveCurrentTripButton";
import { WorkspaceVersionSaveButton } from "./WorkspaceVersionSaveButton";

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
  const [hasProjectVersionContext, setHasProjectVersionContext] = useState(false);

  useEffect(() => {
    const projectSession = getProjectSession();
    setHasProjectVersionContext(
      Boolean(projectSession?.projectId && projectSession.versionId),
    );
  }, []);

  if (hasProjectVersionContext) {
    return (
      <WorkspaceVersionSaveButton
        tripPlan={tripPlan}
        tripRequest={tripRequest}
      />
    );
  }

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
