import {
  WORKSPACE_SESSION_STORAGE_KEY,
  getWorkspaceSessionMetadata,
  type StorageLike,
  type WorkspaceSessionMetadata,
} from "../trip/storage";
import type {
  TravelProjectFlowStage,
  TravelProjectSourceType,
} from "./types";

export const PROJECT_SESSION_STORAGE_KEY = "travel-planning:project-session";

export type TravelProjectSessionSourceType =
  | "ai_prompt"
  | "explore_import"
  | "blank_manual"
  | "legacy_import"
  | TravelProjectSourceType;

export interface TravelProjectSession {
  projectId?: string;
  versionId?: string;
  sourceType?: TravelProjectSessionSourceType;
  flowStage?: TravelProjectFlowStage;
  updatedAt: string;
}

export interface WorkspaceProjectSession {
  workspaceSession: WorkspaceSessionMetadata | null;
  projectSession: TravelProjectSession | null;
}

function browserStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) {
    return storage;
  }

  return typeof window === "undefined" ? undefined : window.localStorage;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFlowStage(value: unknown): value is TravelProjectFlowStage {
  return (
    value === "source_received" ||
    value === "source_review" ||
    value === "clarifying" ||
    value === "proposal_ready" ||
    value === "proposal_adjusting" ||
    value === "generating" ||
    value === "workspace_ready" ||
    value === "abandoned"
  );
}

function isSessionSourceType(
  value: unknown,
): value is TravelProjectSessionSourceType {
  return (
    value === "ai_prompt" ||
    value === "blank_input" ||
    value === "explore_archive" ||
    value === "import_text" ||
    value === "uploaded_file" ||
    value === "existing_trip" ||
    value === "explore_import" ||
    value === "blank_manual" ||
    value === "legacy_import"
  );
}

function parseProjectSession(
  serialized: string,
): TravelProjectSession | null {
  try {
    const parsed = JSON.parse(serialized) as Partial<TravelProjectSession>;

    if (!isNonEmptyString(parsed.updatedAt)) {
      return null;
    }

    return {
      ...(isNonEmptyString(parsed.projectId)
        ? { projectId: parsed.projectId.trim() }
        : {}),
      ...(isNonEmptyString(parsed.versionId)
        ? { versionId: parsed.versionId.trim() }
        : {}),
      ...(isSessionSourceType(parsed.sourceType)
        ? { sourceType: parsed.sourceType }
        : {}),
      ...(isFlowStage(parsed.flowStage)
        ? { flowStage: parsed.flowStage }
        : {}),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function getProjectSession(
  storage?: StorageLike,
): TravelProjectSession | null {
  const targetStorage = browserStorage(storage);
  const serialized = targetStorage?.getItem(PROJECT_SESSION_STORAGE_KEY);

  if (!serialized) {
    return null;
  }

  const parsed = parseProjectSession(serialized);

  if (parsed) {
    return parsed;
  }

  targetStorage?.removeItem(PROJECT_SESSION_STORAGE_KEY);
  return null;
}

export function setProjectSession(
  input: Omit<TravelProjectSession, "updatedAt"> & { updatedAt?: string },
  storage?: StorageLike,
): TravelProjectSession {
  const nextSession: TravelProjectSession = {
    ...(isNonEmptyString(input.projectId)
      ? { projectId: input.projectId.trim() }
      : {}),
    ...(isNonEmptyString(input.versionId)
      ? { versionId: input.versionId.trim() }
      : {}),
    ...(isSessionSourceType(input.sourceType)
      ? { sourceType: input.sourceType }
      : {}),
    ...(isFlowStage(input.flowStage) ? { flowStage: input.flowStage } : {}),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };

  browserStorage(storage)?.setItem(
    PROJECT_SESSION_STORAGE_KEY,
    JSON.stringify(nextSession),
  );

  return nextSession;
}

export function mergeProjectSession(
  patch: Partial<Omit<TravelProjectSession, "updatedAt">> & {
    updatedAt?: string;
  },
  storage?: StorageLike,
): TravelProjectSession {
  const current = getProjectSession(storage);

  return setProjectSession(
    {
      projectId: patch.projectId ?? current?.projectId,
      versionId: patch.versionId ?? current?.versionId,
      sourceType: patch.sourceType ?? current?.sourceType,
      flowStage: patch.flowStage ?? current?.flowStage,
      updatedAt: patch.updatedAt,
    },
    storage,
  );
}

export function clearProjectSession(storage?: StorageLike) {
  browserStorage(storage)?.removeItem(PROJECT_SESSION_STORAGE_KEY);
}

export function clearAllWorkspaceProjectSessionState(storage?: StorageLike) {
  const targetStorage = browserStorage(storage);

  targetStorage?.removeItem(WORKSPACE_SESSION_STORAGE_KEY);
  targetStorage?.removeItem(PROJECT_SESSION_STORAGE_KEY);
}

export function getWorkspaceProjectSession(
  storage?: StorageLike,
): WorkspaceProjectSession {
  return {
    workspaceSession: getWorkspaceSessionMetadata(storage),
    projectSession: getProjectSession(storage),
  };
}
