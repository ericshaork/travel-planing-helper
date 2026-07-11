import { z } from "zod";

import {
  parseTripResponseSchema,
  tripPlanDraftSchema,
  tripPlanSchema,
  tripRequestDraftSchema,
  tripRequestSchema,
} from "./schema";
import type {
  ParseTripResponse,
  TripPlan,
  TripPlanDraft,
  TripRequest,
  TripRequestDraft,
} from "./types";

export const PARSED_TRIP_STORAGE_KEY = "travel-planning:parsed-trip";
export const TRIP_DRAFT_STORAGE_KEY = "travel-planning:trip-draft";
export const TRIP_PLAN_DRAFT_STORAGE_KEY = "travel-planning:trip-plan-draft";
export const TRIP_REQUEST_STORAGE_KEY = "travel-planning:trip-request";
export const TRIP_PLAN_STORAGE_KEY = "travel-planning:trip-plan";
export const TRIP_ENRICHMENT_STORAGE_KEY = "travel-planning:trip-enrichment";
export const TRIP_WEATHER_SUMMARY_STORAGE_KEY = "travel-planning:trip-weather-summary";
export const RESTORED_SAVED_TRIP_STORAGE_KEY = "travel-planning:restored-saved-trip";

export interface ParsedTripSession {
  rawInput: string;
  selectedInterests: string[];
  selectedTravelStyles: string[];
  parseResult: ParseTripResponse;
  updatedAt: string;
}

export type ParsedTripSessionInput = Omit<ParsedTripSession, "updatedAt">;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface SavedTripMetadata {
  savedTripId: string;
  savedTripTitle: string;
  restoredAt?: string;
  savedAt?: string;
}

type SavedTripMetadataInput = Omit<SavedTripMetadata, "savedAt"> & {
  savedAt?: string;
};

const parsedTripSessionSchema: z.ZodType<ParsedTripSession> = z
  .object({
    rawInput: z.string().trim().min(1).max(2000),
    selectedInterests: z.array(z.string().trim().min(1)),
    selectedTravelStyles: z.array(z.string().trim().min(1)),
    parseResult: parseTripResponseSchema,
    updatedAt: z.string().datetime(),
  })
  .strict();

function browserStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) {
    return storage;
  }

  return typeof window === "undefined" ? undefined : window.localStorage;
}

function removeSavedTripMetadata(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(RESTORED_SAVED_TRIP_STORAGE_KEY);
}

function parseSavedTripMetadata(
  serialized: string,
): SavedTripMetadata | null {
  try {
    const parsed = JSON.parse(serialized) as Partial<SavedTripMetadata>;

    if (
      typeof parsed.savedTripId === "string" &&
      parsed.savedTripId.trim() &&
      typeof parsed.savedTripTitle === "string" &&
      parsed.savedTripTitle.trim()
    ) {
      return {
        savedTripId: parsed.savedTripId.trim(),
        savedTripTitle: parsed.savedTripTitle.trim(),
        ...(typeof parsed.restoredAt === "string" && parsed.restoredAt.trim()
          ? { restoredAt: parsed.restoredAt }
          : {}),
        ...(typeof parsed.savedAt === "string" && parsed.savedAt.trim()
          ? { savedAt: parsed.savedAt }
          : {}),
      };
    }
  } catch {
    // Invalid browser state is cleared by caller.
  }

  return null;
}

export function getSavedTripMetadata(
  storage?: StorageLike,
): SavedTripMetadata | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(RESTORED_SAVED_TRIP_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  const parsed = parseSavedTripMetadata(serialized);

  if (parsed) {
    return parsed;
  }

  removeSavedTripMetadata(targetStorage);
  return null;
}

export function setSavedTripMetadata(
  metadata: SavedTripMetadataInput,
  storage?: StorageLike,
): SavedTripMetadata {
  const nextMetadata: SavedTripMetadata = {
    savedTripId: metadata.savedTripId.trim(),
    savedTripTitle: metadata.savedTripTitle.trim(),
    ...(metadata.restoredAt ? { restoredAt: metadata.restoredAt } : {}),
    ...(metadata.savedAt ? { savedAt: metadata.savedAt } : {}),
  };

  browserStorage(storage)?.setItem(
    RESTORED_SAVED_TRIP_STORAGE_KEY,
    JSON.stringify(nextMetadata),
  );

  return nextMetadata;
}

export function clearSavedTripMetadata(storage?: StorageLike) {
  removeSavedTripMetadata(storage);
}

export function markCurrentTripAsSaved(
  metadata: SavedTripMetadataInput,
  storage?: StorageLike,
) {
  const previous = getSavedTripMetadata(storage);

  return setSavedTripMetadata(
    {
      savedTripId: metadata.savedTripId,
      savedTripTitle: metadata.savedTripTitle,
      restoredAt: metadata.restoredAt ?? previous?.restoredAt,
      savedAt: metadata.savedAt ?? new Date().toISOString(),
    },
    storage,
  );
}

export function markCurrentTripAsUnsaved(storage?: StorageLike) {
  clearSavedTripMetadata(storage);
}

export function saveParsedTripSession(
  input: ParsedTripSessionInput,
  storage?: StorageLike,
): ParsedTripSession {
  const session = parsedTripSessionSchema.parse({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  const targetStorage = browserStorage(storage);
  targetStorage?.setItem(PARSED_TRIP_STORAGE_KEY, JSON.stringify(session));
  targetStorage?.removeItem(TRIP_DRAFT_STORAGE_KEY);
  targetStorage?.removeItem(TRIP_PLAN_DRAFT_STORAGE_KEY);
  targetStorage?.removeItem(TRIP_REQUEST_STORAGE_KEY);
  targetStorage?.removeItem(TRIP_PLAN_STORAGE_KEY);
  removeSavedTripMetadata(targetStorage);

  return session;
}

export function loadParsedTripSession(
  storage?: StorageLike,
): ParsedTripSession | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(PARSED_TRIP_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = parsedTripSessionSchema.safeParse(JSON.parse(serialized));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid browser state is cleared below.
  }

  targetStorage?.removeItem(PARSED_TRIP_STORAGE_KEY);
  return null;
}

export function saveTripRequestDraft(
  draft: TripRequestDraft,
  storage?: StorageLike,
): boolean {
  const parsed = tripRequestDraftSchema.safeParse(draft);

  if (!parsed.success) {
    return false;
  }

  browserStorage(storage)?.setItem(
    TRIP_DRAFT_STORAGE_KEY,
    JSON.stringify(parsed.data),
  );
  return true;
}

export function clearTripRequestDraft(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(TRIP_DRAFT_STORAGE_KEY);
}

export function loadTripRequestDraft(
  storage?: StorageLike,
): TripRequestDraft | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(TRIP_DRAFT_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = tripRequestDraftSchema.safeParse(JSON.parse(serialized));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid browser state is cleared below.
  }

  targetStorage?.removeItem(TRIP_DRAFT_STORAGE_KEY);
  return null;
}

export function saveTripPlanDraft(
  draft: TripPlanDraft,
  storage?: StorageLike,
): TripPlanDraft {
  const parsed = tripPlanDraftSchema.parse(draft);
  const targetStorage = browserStorage(storage);

  targetStorage?.setItem(
    TRIP_PLAN_DRAFT_STORAGE_KEY,
    JSON.stringify(parsed),
  );
  targetStorage?.setItem(
    TRIP_DRAFT_STORAGE_KEY,
    JSON.stringify(parsed.tripRequestDraft),
  );

  return parsed;
}

export function loadTripPlanDraft(
  storage?: StorageLike,
): TripPlanDraft | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(TRIP_PLAN_DRAFT_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = tripPlanDraftSchema.safeParse(JSON.parse(serialized));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid browser state is cleared below.
  }

  targetStorage?.removeItem(TRIP_PLAN_DRAFT_STORAGE_KEY);
  return null;
}

export function clearTripPlanDraft(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(TRIP_PLAN_DRAFT_STORAGE_KEY);
}

export function saveTripRequest(
  tripRequest: TripRequest,
  storage?: StorageLike,
): TripRequest {
  const parsed = tripRequestSchema.parse(tripRequest);
  browserStorage(storage)?.setItem(
    TRIP_REQUEST_STORAGE_KEY,
    JSON.stringify(parsed),
  );
  return parsed;
}

export function loadTripRequest(
  storage?: StorageLike,
): TripRequest | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(TRIP_REQUEST_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = tripRequestSchema.safeParse(JSON.parse(serialized));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid browser state is cleared below.
  }

  targetStorage?.removeItem(TRIP_REQUEST_STORAGE_KEY);
  return null;
}

export function saveTripPlan(
  tripPlan: TripPlan,
  storage?: StorageLike,
): TripPlan {
  const parsed = tripPlanSchema.parse(tripPlan);
  browserStorage(storage)?.setItem(
    TRIP_PLAN_STORAGE_KEY,
    JSON.stringify(parsed),
  );
  return parsed;
}

export function loadTripPlan(storage?: StorageLike): TripPlan | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(TRIP_PLAN_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = tripPlanSchema.safeParse(JSON.parse(serialized));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid browser state is cleared below.
  }

  targetStorage?.removeItem(TRIP_PLAN_STORAGE_KEY);
  return null;
}
