"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import {
  ensureWorkspaceProjectEntry,
  ENTRY_SESSION_SOURCE_TYPES,
  type EnsureWorkspaceProjectEntryResult,
} from "../projects/entry-client";
import {
  setProjectSession,
  type TravelProjectSession,
} from "../projects/session";
import {
  markCurrentTripAsUnsaved,
  saveTripPlan,
  saveTripPlanDraft,
  type StorageLike,
} from "../trip/storage";
import type { TripPlanDraft } from "../trip/types";
import type { ApiErrorResponse } from "../utils/errors";
import type { TravelProjectFlowStage } from "../projects/types";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface ExploreProjectCreateResponse {
  project?: {
    id?: string;
    currentFlowStage?: TravelProjectFlowStage | null;
  };
}

interface ExploreCopilotBootstrapResponse {
  stage?: TravelProjectFlowStage;
}

export interface ExploreProjectFlowDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
}

function getDefaultFetcher(): FetchLike {
  return (input, init) => globalThis.fetch(input, init);
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  return (payload as Partial<ApiErrorResponse> | null)?.error?.message ?? fallback;
}

function buildExploreSourcePayload(draft: TripPlanDraft) {
  return {
    sourceOrigin: draft.sourceType,
    sourceType: draft.sourceType,
    tripTitle: draft.tripTitle,
    sourceExploreId: draft.sourceExploreId,
    sourceExploreSlug: draft.sourceExploreSlug,
    tripRequestDraft: draft.tripRequestDraft,
    tripPlanSeed: draft.tripPlanSeed,
  };
}

function buildExploreProjectTitle(draft: TripPlanDraft) {
  const destination = draft.tripRequestDraft.destinationCity?.trim();
  const days = draft.tripRequestDraft.days;

  if (destination && typeof days === "number" && Number.isFinite(days)) {
    return `${destination} ${days} day explore draft`;
  }

  if (destination) {
    return `${destination} explore draft`;
  }

  return draft.tripTitle.trim().slice(0, 120) || "Explore travel project";
}

function buildExploreBootstrapMessage(draft: TripPlanDraft) {
  const parts = [
    draft.tripRequestDraft.destinationCity
      ? `I want to build on this ${draft.tripRequestDraft.destinationCity} explore draft`
      : "I want to build on this explore draft",
    typeof draft.tripRequestDraft.days === "number"
      ? `for ${draft.tripRequestDraft.days} days`
      : "",
    draft.tripRequestDraft.interests?.length
      ? `with a focus on ${draft.tripRequestDraft.interests.join(", ")}`
      : "",
    draft.tripRequestDraft.travelStyles?.length
      ? `and a ${draft.tripRequestDraft.travelStyles.join(", ")} style`
      : "",
    draft.tripRequestDraft.specialRequirements?.trim() ?? "",
  ].filter(Boolean);

  return `${parts.join(" ")}.`.replace(/\s+\./g, ".");
}

async function createExploreProject(
  draft: TripPlanDraft,
  input: {
    lifecycleState: "planning" | "workspace";
    flowStage: TravelProjectFlowStage;
    storage?: StorageLike;
  },
  dependencies: ExploreProjectFlowDependencies,
) {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const fetcher = dependencies.fetcher ?? getDefaultFetcher();
  const accessToken = await getAccessToken().catch(() => null);

  if (!accessToken) {
    console.error("[Explore Project Create] Missing access token", {
      hasAccessToken: false,
    });
    throw new Error("璇峰厛鐧诲綍锛屽啀浠?Explore 鍒涘缓鏃呰椤圭洰銆?");
  }

  const projectPayload = {
    title: buildExploreProjectTitle(draft),
    sourceType: "explore_archive" as const,
    initialMetadata: {
      lifecycleState: input.lifecycleState,
      flowStage: input.flowStage,
      sourceTitle: draft.tripTitle.trim().slice(0, 160) || null,
      sourcePayload: buildExploreSourcePayload(draft),
    },
  };

  console.info("[Explore Project Create] Request", {
    hasAccessToken: true,
    payload: projectPayload,
  });

  let response: Response;

  try {
    response = await fetcher("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(projectPayload),
    });
  } catch (error) {
    console.error("[Explore Project Create] Fetch failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    throw error;
  }

  const contentType = response.headers.get("content-type");
  const rawBody = await response.text();

  console.info("[Explore Project Create] Response", {
    status: response.status,
    contentType,
    rawBody,
  });

  let payload: ExploreProjectCreateResponse | ApiErrorResponse | null = null;

  try {
    payload = rawBody
      ? (JSON.parse(rawBody) as ExploreProjectCreateResponse | ApiErrorResponse)
      : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !("project" in payload) || !payload.project?.id) {
    throw new Error(
      getApiErrorMessage(payload, "鏃呰椤圭洰鍒涘缓澶辫触锛岃绋嶅悗鍐嶈瘯銆?"),
    );
  }

  return {
    accessToken,
    projectId: payload.project.id,
    flowStage: payload.project.currentFlowStage ?? input.flowStage,
  };
}

export async function startExploreProjectCreateFlow(
  draft: TripPlanDraft,
  storage?: StorageLike,
  dependencies: ExploreProjectFlowDependencies = {},
): Promise<TravelProjectSession | null> {
  const created = await createExploreProject(
    draft,
    {
      lifecycleState: "planning",
      flowStage: "source_received",
      storage,
    },
    dependencies,
  );

  const fetcher = dependencies.fetcher ?? getDefaultFetcher();
  let flowStage = created.flowStage;

  const copilotResponse = await fetcher(
    `/api/projects/${created.projectId}/copilot`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${created.accessToken}`,
      },
      body: JSON.stringify({
        message: buildExploreBootstrapMessage(draft),
      }),
    },
  ).catch(() => null);

  if (copilotResponse?.ok) {
    const copilotPayload =
      (await copilotResponse.json()) as ExploreCopilotBootstrapResponse;

    if (copilotPayload.stage) {
      flowStage = copilotPayload.stage;
    }
  }

  markCurrentTripAsUnsaved(storage);
  saveTripPlanDraft(draft, storage);

  return setProjectSession(
    {
      projectId: created.projectId,
      sourceType: ENTRY_SESSION_SOURCE_TYPES.exploreImport,
      flowStage,
    },
    storage,
  );
}

export async function startExploreProjectWorkspaceFlow(
  draft: TripPlanDraft,
  workspacePlan: ReturnType<typeof saveTripPlan>,
  storage?: StorageLike,
  dependencies: ExploreProjectFlowDependencies = {},
): Promise<TravelProjectSession | null> {
  const created = await prepareExploreProjectWorkspaceFlow(
    draft,
    workspacePlan,
    storage,
    dependencies,
  );

  return created.projectSession;
}

export async function prepareExploreProjectWorkspaceFlow(
  draft: TripPlanDraft,
  workspacePlan: ReturnType<typeof saveTripPlan>,
  storage?: StorageLike,
  dependencies: ExploreProjectFlowDependencies = {},
): Promise<EnsureWorkspaceProjectEntryResult> {
  const created = await ensureWorkspaceProjectEntry(
    {
      title: buildExploreProjectTitle(draft),
      sessionSourceType: ENTRY_SESSION_SOURCE_TYPES.exploreImport,
      sourceTitle: draft.tripTitle.trim().slice(0, 160) || null,
      sourcePayload: buildExploreSourcePayload(draft),
      tripPlan: workspacePlan,
      tripRequest: null,
      createdFrom: "template_import",
      lifecycleState: "workspace",
      flowStage: "workspace_ready",
      workspaceModeDefault: "read",
      storage,
    },
    dependencies,
  );

  if (!created) {
    throw new Error("璇峰厛鐧诲綍锛屽啀灏嗚繖浠借绋嬪鍏ュ伐浣滃彴銆?");
  }

  markCurrentTripAsUnsaved(storage);
  saveTripPlanDraft(
    {
      ...draft,
      tripPlanSeed: workspacePlan,
    },
    storage,
  );

  return created;
}
