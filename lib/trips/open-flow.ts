import { ENTRY_SESSION_SOURCE_TYPES } from "../projects/entry-client";
import { mergeProjectSession } from "../projects/session";
import type { StorageLike } from "../trip/storage";
import { openSavedTrip } from "./open-client";
import { restoreSavedTripToStorage } from "./restore-saved-trip";
import type { SavedTripDetail, SavedTripListItem } from "./types";

interface OpenSavedTripIntoWorkspaceOptions {
  storage?: StorageLike;
  openTrip?: typeof openSavedTrip;
  restoreTrip?: typeof restoreSavedTripToStorage;
  markTripOpened?: (tripId: string) => Promise<unknown>;
  navigate?: (href: string) => void;
}

export async function openSavedTripIntoWorkspace(
  tripOrItem: string | SavedTripListItem,
  options?: OpenSavedTripIntoWorkspaceOptions,
) {
  if (typeof tripOrItem !== "string" && tripOrItem.entity_type === "project") {
    if (!tripOrItem.project_id || !tripOrItem.current_version_id) {
      throw new Error("这个旅行项目还没有可恢复的当前版本。");
    }

    mergeProjectSession(
      {
        projectId: tripOrItem.project_id,
        versionId: tripOrItem.current_version_id,
        sourceType:
          tripOrItem.project_source_type === "uploaded_file"
            ? "uploaded_file"
            : tripOrItem.project_source_type === "import_text"
              ? "import_text"
              : tripOrItem.source_type === "explore_import"
            ? ENTRY_SESSION_SOURCE_TYPES.exploreImport
            : tripOrItem.source_type === "blank_manual"
              ? ENTRY_SESSION_SOURCE_TYPES.blankManual
              : ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
        flowStage: "workspace_ready",
      },
      options?.storage,
    );
    options?.navigate?.("/workspace");
    return tripOrItem;
  }

  const tripId = typeof tripOrItem === "string" ? tripOrItem : tripOrItem.id;
  const openTrip = options?.openTrip ?? openSavedTrip;
  const restoreTrip = options?.restoreTrip ?? restoreSavedTripToStorage;
  const navigate = options?.navigate;

  try {
    await options?.markTripOpened?.(tripId);
  } catch {
    // Keep the existing restore/open flow usable even if last_opened_at fails.
  }

  const trip = (await openTrip(tripId)) as SavedTripDetail;

  restoreTrip({ trip }, options?.storage);
  navigate?.("/workspace");

  return trip;
}
