import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { markCurrentTripAsUnsaved, saveTripPlanDraft } from "../trip/storage";
import type { TripPlanDraft } from "../trip/types";

export function startExploreCreateFlow(
  draft: TripPlanDraft,
  router: AppRouterInstance,
) {
  markCurrentTripAsUnsaved();
  saveTripPlanDraft(draft);
  router.push("/create?entry=explore");
}
