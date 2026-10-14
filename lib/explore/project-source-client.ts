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
    return null;
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

  const response = await fetcher("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(projectPayload),
  });
  const rawBody = await response.text();

  let payload: ExploreProjectCreateResponse | ApiErrorResponse | null = null;

  try {
    payload = rawBody
      ? (JSON.parse(rawBody) as ExploreProjectCreateResponse | ApiErrorResponse)
      : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !("project" in payload) || !payload.project?.id) {
    if (
      response.status === 401 ||
      (payload as Partial<ApiErrorResponse> | null)?.error?.code ===
        "UNAUTHORIZED"
    ) {
      return null;
    }

    throw new Error(
      getApiErrorMessage(payload, "旅行项目创建失败，请稍后再试。"),
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

  if (!created) {
    markCurrentTripAsUnsaved(storage);
    saveTripPlanDraft(draft, storage);
    return null;
  }

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
    throw new Error("请先登录，再将这份行程导入工作台。");
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
