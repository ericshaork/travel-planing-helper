import type { StorageLike } from "../trip/storage";
import {
  ensureWorkspaceSessionMetadata,
  getSavedTripMetadata,
  getWorkspaceSessionMetadata,
  markCurrentTripAsSaved,
} from "../trip/storage";
import {
  buildSavedTripTitle,
  mapWorkspaceSourceTypeToTripSourceType,
} from "./save-payload";
import { saveTripToCloud } from "./save-client";
import type { SaveTripRequestPayload } from "./types";
import { updateSavedTripInCloud } from "./update-client";

interface PersistCurrentTripOptions {
  storage?: StorageLike;
  createTrip?: typeof saveTripToCloud;
  updateTrip?: typeof updateSavedTripInCloud;
  getMetadata?: typeof getSavedTripMetadata;
  getWorkspaceSession?: typeof getWorkspaceSessionMetadata;
  ensureWorkspaceSession?: typeof ensureWorkspaceSessionMetadata;
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
  const getWorkspaceSession =
    options?.getWorkspaceSession ?? getWorkspaceSessionMetadata;
  const ensureWorkspaceSession =
    options?.ensureWorkspaceSession ?? ensureWorkspaceSessionMetadata;
  const markSaved = options?.markSaved ?? markCurrentTripAsSaved;
  const currentMetadata = getMetadata(storage);
  const currentWorkspaceSession = getWorkspaceSession(storage);
  const workspaceSession = currentWorkspaceSession?.localDraftId
    ? currentWorkspaceSession
    : ensureWorkspaceSession(
        {
          sourceType: currentWorkspaceSession?.sourceType ?? "ai_generated",
          workspaceModeDefault:
            currentWorkspaceSession?.workspaceModeDefault ?? "read",
        },
        storage,
      );
  const savedTripTitle = buildSavedTripTitle(payload.tripRequest, payload.tripPlan);
  const payloadWithSaveMetadata: SaveTripRequestPayload = {
    ...payload,
    saveMetadata: {
      sourceType: mapWorkspaceSourceTypeToTripSourceType(
        workspaceSession.sourceType,
      ),
      status: "saved",
      localDraftId: workspaceSession.localDraftId ?? null,
    },
  };

  if (currentMetadata?.savedTripId) {
    const response = await updateTrip(
      currentMetadata.savedTripId,
      payloadWithSaveMetadata,
    );

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

  const response = await createTrip(payloadWithSaveMetadata);

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
