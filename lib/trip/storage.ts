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
export const WORKSPACE_SESSION_STORAGE_KEY = "travel-planning:workspace-session";

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

export type WorkspaceModeDefault = "read" | "edit";
export type WorkspaceSessionSourceType =
  | "ai_generated"
  | "saved_trip"
  | "blank_manual";

export interface WorkspaceSessionMetadata {
  sourceType: WorkspaceSessionSourceType;
  workspaceModeDefault: WorkspaceModeDefault;
  localDraftId?: string;
  blankDraftId?: string;
  createdAt?: string;
  updatedAt: string;
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

const workspaceSessionMetadataSchema: z.ZodType<WorkspaceSessionMetadata> = z
  .object({
    sourceType: z.enum(["ai_generated", "saved_trip", "blank_manual"]),
    workspaceModeDefault: z.enum(["read", "edit"]),
    localDraftId: z.string().trim().min(1).optional(),
    blankDraftId: z.string().trim().min(1).optional(),
    createdAt: z.string().datetime().optional(),
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

function removeWorkspaceSessionMetadata(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(WORKSPACE_SESSION_STORAGE_KEY);
}

function createClientDraftId(prefix: "local-draft" | "blank-draft") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

export function getWorkspaceSessionMetadata(
  storage?: StorageLike,
): WorkspaceSessionMetadata | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(WORKSPACE_SESSION_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = workspaceSessionMetadataSchema.safeParse(
      JSON.parse(serialized),
    );

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid browser state is cleared below.
  }

  removeWorkspaceSessionMetadata(targetStorage);
  return null;
}

export function setWorkspaceSessionMetadata(
  metadata: Omit<WorkspaceSessionMetadata, "updatedAt"> & {
    updatedAt?: string;
  },
  storage?: StorageLike,
): WorkspaceSessionMetadata {
  const parsed = workspaceSessionMetadataSchema.parse({
    ...metadata,
    updatedAt: metadata.updatedAt ?? new Date().toISOString(),
  });

  browserStorage(storage)?.setItem(
    WORKSPACE_SESSION_STORAGE_KEY,
    JSON.stringify(parsed),
  );

  return parsed;
}

export function clearWorkspaceSessionMetadata(storage?: StorageLike) {
  removeWorkspaceSessionMetadata(storage);
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
  removeWorkspaceSessionMetadata(targetStorage);

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

export function clearTripRequest(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(TRIP_REQUEST_STORAGE_KEY);
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

export function clearTripPlan(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(TRIP_PLAN_STORAGE_KEY);
}

export function createBlankWorkspaceDraft(storage?: StorageLike) {
  const targetStorage = browserStorage(storage);

  if (!targetStorage) {
    throw new Error("Blank workspace draft requires browser storage.");
  }

  const createdAt = new Date().toISOString();
  const localDraftId = createClientDraftId("local-draft");
  const blankDraftId = createClientDraftId("blank-draft");
  const blankTripPlan = saveTripPlan(
    {
      tripTitle: "未命名旅行",
      summary: "这是一份空白旅行计划，你可以先补目的地、日期和想去的地点。",
      destination: "待定目的地",
      days: 1,
      travelStyleSummary: "先从一张空白计划开始，后面再慢慢补完整。",
      weatherSummary: {
        available: false,
        overview: "暂时还没有天气信息，等目的地和日期确定后再补。",
        dailyForecast: [],
        alerts: [],
        reminders: [],
        dataNote: "空白计划不会预先生成天气数据。",
      },
      budgetSummary: {
        totalEstimate: "待补充",
        transport: "待补充",
        hotel: "待补充",
        food: "待补充",
        tickets: "待补充",
        localTransport: "待补充",
        flexibleSpending: "待补充",
        note: "这是一份空白计划，预算会在补全需求后更新。",
      },
      hotelAreaAdvice: [],
      transportAdvice: {
        summary: "先补出发地和目的地，后面再决定怎么走更顺。",
        options: [
          {
            mode: "other",
            pros: ["先把计划骨架搭起来"],
            cons: ["交通方案还没确定"],
            recommendation: "等行程信息更完整后，再补具体交通建议。",
          },
        ],
        suggestedPlatforms: [],
        note: "空白计划阶段暂不提供具体交通平台建议。",
      },
      dailyItinerary: [
        {
          day: 1,
          theme: "待整理的第 1 天",
          routeOrder: ["待补充地点"],
          routeReason: "先从这一天开始补地点和路线，后面可以继续扩展。",
          morning: [],
          afternoon: [],
          evening: [],
          dailyTips: ["先补上目的地、日期和想去的地方。"],
        },
      ],
      generalTips: ["这是空白计划草稿，先补内容，再慢慢调整路线。"],
      warnings: [],
    },
    targetStorage,
  );

  clearTripRequest(targetStorage);
  clearTripRequestDraft(targetStorage);
  clearTripPlanDraft(targetStorage);
  targetStorage.removeItem(PARSED_TRIP_STORAGE_KEY);
  targetStorage.removeItem(TRIP_ENRICHMENT_STORAGE_KEY);
  targetStorage.removeItem(TRIP_WEATHER_SUMMARY_STORAGE_KEY);
  markCurrentTripAsUnsaved(targetStorage);

  const workspaceSession = setWorkspaceSessionMetadata(
    {
      sourceType: "blank_manual",
      workspaceModeDefault: "edit",
      localDraftId,
      blankDraftId,
      createdAt,
    },
    targetStorage,
  );

  return {
    tripPlan: blankTripPlan,
    workspaceSession,
  };
}
