import { z } from "zod";

import {
  parseTripResponseSchema,
  tripPlanSchema,
  tripRequestDraftSchema,
  tripRequestSchema,
} from "./schema";
import type {
  ParseTripResponse,
  TripPlan,
  TripRequest,
  TripRequestDraft,
} from "./types";

export const PARSED_TRIP_STORAGE_KEY = "travel-planning:parsed-trip";
export const TRIP_DRAFT_STORAGE_KEY = "travel-planning:trip-draft";
export const TRIP_REQUEST_STORAGE_KEY = "travel-planning:trip-request";
export const TRIP_PLAN_STORAGE_KEY = "travel-planning:trip-plan";

export interface ParsedTripSession {
  rawInput: string;
  selectedInterests: string[];
  selectedTravelStyles: string[];
  parseResult: ParseTripResponse;
  updatedAt: string;
}

export type ParsedTripSessionInput = Omit<ParsedTripSession, "updatedAt">;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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
  targetStorage?.removeItem(TRIP_REQUEST_STORAGE_KEY);
  targetStorage?.removeItem(TRIP_PLAN_STORAGE_KEY);

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
