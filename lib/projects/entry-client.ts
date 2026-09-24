"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import {
  createBlankWorkspaceDraft,
  ensureWorkspaceSessionMetadata,
  saveTripPlan,
  saveTripRequest,
  type StorageLike,
  type WorkspaceModeDefault,
  type WorkspaceSessionSourceType,
} from "../trip/storage";
import type { ApiErrorResponse } from "../utils/errors";
import type { TripPlan, TripRequest } from "../trip/types";
import type {
  TravelProjectFlowStage,
  TravelProjectLifecycleState,
  TravelProjectSourceType,
  TravelProjectVersionReason,
} from "./types";
import {
  getProjectSession,
  setProjectSession,
  type TravelProjectSession,
  type TravelProjectSessionSourceType,
} from "./session";
import { markWorkspaceProjectLocalFallback } from "./workspace-context-client";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export const ENTRY_SESSION_SOURCE_TYPES = {
  aiPrompt: "ai_prompt",
  exploreImport: "explore_import",
  blankManual: "blank_manual",
  legacyImport: "legacy_import",
} as const;

export type UnifiedEntrySessionSourceType =
  (typeof ENTRY_SESSION_SOURCE_TYPES)[keyof typeof ENTRY_SESSION_SOURCE_TYPES];

function getDefaultFetcher(): FetchLike {
  return (input, init) => globalThis.fetch(input, init);
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  return (payload as Partial<ApiErrorResponse> | null)?.error?.message ?? fallback;
}

function mapSessionSourceToProjectSource(
  sourceType: TravelProjectSessionSourceType,
): TravelProjectSourceType {
  switch (sourceType) {
    case "explore_import":
    case "explore_archive":
      return "explore_archive";
    case "legacy_import":
    case "existing_trip":
      return "existing_trip";
    case "import_text":
      return "import_text";
    case "uploaded_file":
      return "uploaded_file";
    case "blank_manual":
    case "ai_prompt":
    case "blank_input":
    default:
      return "blank_input";
  }
}

function mapSessionSourceToWorkspaceSource(
  sourceType: TravelProjectSessionSourceType,
): WorkspaceSessionSourceType {
  switch (sourceType) {
    case "explore_import":
    case "explore_archive":
      return "explore_import";
    case "blank_manual":
      return "blank_manual";
    case "legacy_import":
    case "existing_trip":
      return "saved_trip";
    case "ai_prompt":
    case "blank_input":
    case "import_text":
    case "uploaded_file":
    default:
      return "ai_generated";
  }
}

interface AuthorizedClient {
  accessToken: string;
  fetcher: FetchLike;
}

async function getAuthorizedClient(
  dependencies: {
    fetcher?: FetchLike;
    getAccessToken?: () => Promise<string | null>;
  },
): Promise<AuthorizedClient | null> {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    fetcher: dependencies.fetcher ?? getDefaultFetcher(),
  };
}

interface EntryProjectDetailPayload {
  project?: {
    id?: string;
    currentFlowStage?: TravelProjectFlowStage | null;
  };
}

interface EntryProjectVersionPayload {
  version?: {
    id?: string;
  };
}

export interface EnsureWorkspaceProjectEntryInput {
  title: string;
  sessionSourceType: TravelProjectSessionSourceType;
  sourceTitle?: string | null;
  sourcePayload?: Record<string, unknown>;
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
  createdFrom: TravelProjectVersionReason;
  createdBy?: string | null;
  existingProjectId?: string;
  lifecycleState?: TravelProjectLifecycleState;
  flowStage?: TravelProjectFlowStage;
  workspaceModeDefault?: WorkspaceModeDefault;
  storage?: StorageLike;
}

export interface EnsureWorkspaceProjectEntryResult {
  projectSession: TravelProjectSession;
  projectId: string;
  versionId: string;
}

export interface EntryClientDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
}

async function createOrReuseProject(
  input: EnsureWorkspaceProjectEntryInput,
  client: AuthorizedClient,
): Promise<{ projectId: string; flowStage: TravelProjectFlowStage }> {
  if (input.existingProjectId) {
    return {
      projectId: input.existingProjectId,
      flowStage: input.flowStage ?? "workspace_ready",
    };
  }

  const response = await client.fetcher("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${client.accessToken}`,
    },
    body: JSON.stringify({
      title: input.title,
      sourceType: mapSessionSourceToProjectSource(input.sessionSourceType),
      initialMetadata: {
        lifecycleState: input.lifecycleState ?? "workspace",
        flowStage: input.flowStage ?? "workspace_ready",
        sourceTitle: input.sourceTitle ?? null,
        sourcePayload: input.sourcePayload ?? {},
      },
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | EntryProjectDetailPayload
    | ApiErrorResponse
    | null;

  if (
    !response.ok ||
    !payload ||
    !("project" in payload) ||
    !payload.project?.id
  ) {
    throw new Error(
      getApiErrorMessage(
        payload,
        "Unable to create a TravelProject for this workspace entry.",
      ),
    );
  }

  return {
    projectId: payload.project.id,
    flowStage: payload.project.currentFlowStage ?? input.flowStage ?? "workspace_ready",
  };
}

export async function ensureWorkspaceProjectEntry(
  input: EnsureWorkspaceProjectEntryInput,
  dependencies: EntryClientDependencies = {},
): Promise<EnsureWorkspaceProjectEntryResult | null> {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    return null;
  }

  const project = await createOrReuseProject(input, client);
  const versionResponse = await client.fetcher(
    `/api/projects/${project.projectId}/versions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client.accessToken}`,
      },
      body: JSON.stringify({
        versionStatus: "accepted",
        createdFrom: input.createdFrom,
        tripPlan: input.tripPlan,
        tripRequestSnapshot: input.tripRequest ?? null,
        createdBy: input.createdBy ?? "user",
        setAsCurrent: true,
      }),
    },
  );
  const versionPayload = (await versionResponse
    .json()
    .catch(() => null)) as EntryProjectVersionPayload | ApiErrorResponse | null;

  if (
    !versionResponse.ok ||
    !versionPayload ||
    !("version" in versionPayload) ||
    !versionPayload.version?.id
  ) {
    throw new Error(
      getApiErrorMessage(
        versionPayload,
        "Unable to create a TravelProject version for this workspace entry.",
      ),
    );
  }

  await client.fetcher(`/api/projects/${project.projectId}/state`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${client.accessToken}`,
    },
    body: JSON.stringify({
      lifecycleState: input.lifecycleState ?? "workspace",
      currentFlowStage: "workspace_ready",
      currentVersionId: versionPayload.version.id,
      touchActivity: true,
    }),
  }).catch(() => null);

  saveTripPlan(input.tripPlan, input.storage);

  if (input.tripRequest) {
    saveTripRequest(input.tripRequest, input.storage);
  }

  ensureWorkspaceSessionMetadata(
    {
      sourceType: mapSessionSourceToWorkspaceSource(input.sessionSourceType),
      workspaceModeDefault: input.workspaceModeDefault ?? "read",
    },
    input.storage,
  );

  const projectSession = setProjectSession(
    {
      projectId: project.projectId,
      versionId: versionPayload.version.id,
      sourceType: input.sessionSourceType,
      flowStage: "workspace_ready",
    },
    input.storage,
  );
  markWorkspaceProjectLocalFallback(input.storage);

  return {
    projectSession,
    projectId: project.projectId,
    versionId: versionPayload.version.id,
  };
}

export async function createBlankWorkspaceProjectEntry(
  options?: {
    storage?: StorageLike;
  } & EntryClientDependencies,
) {
  const draft = createBlankWorkspaceDraft(options?.storage);
  const result = await ensureWorkspaceProjectEntry(
    {
      title: draft.tripPlan.tripTitle,
      sessionSourceType: ENTRY_SESSION_SOURCE_TYPES.blankManual,
      sourceTitle: draft.tripPlan.tripTitle,
      sourcePayload: {
        sourceOrigin: ENTRY_SESSION_SOURCE_TYPES.blankManual,
      },
      tripPlan: draft.tripPlan,
      tripRequest: null,
      createdFrom: "manual_edit",
      lifecycleState: "workspace",
      flowStage: "workspace_ready",
      workspaceModeDefault: "edit",
      storage: options?.storage,
    },
    options,
  );

  return {
    ...draft,
    projectSession: result?.projectSession ?? null,
  };
}

export function getExistingProjectIdFromSession(storage?: StorageLike) {
  return getProjectSession(storage)?.projectId;
}
