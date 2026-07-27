"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import {
  loadTripPlan,
  loadTripRequest,
  saveTripPlan,
  saveTripRequest,
  type StorageLike,
} from "../trip/storage";
import type { TripPlan, TripRequest } from "../trip/types";
import { getProjectSession, mergeProjectSession } from "./session";
import type { TravelProjectFlowStage } from "./types";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface WorkspaceProjectDetailPayload {
  project?: {
    id?: string;
    currentFlowStage?: TravelProjectFlowStage | null;
  };
  currentVersion?: {
    id?: string;
    tripPlan?: TripPlan;
    tripRequestSnapshot?: TripRequest | null;
  } | null;
}

interface WorkspaceProjectVersionPayload {
  version?: {
    id?: string;
    tripPlan?: TripPlan;
    tripRequestSnapshot?: TripRequest | null;
  };
}

export interface WorkspaceProjectContext {
  projectId: string;
  versionId: string;
  flowStage: TravelProjectFlowStage;
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
}

export interface WorkspaceProjectContextDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  storage?: StorageLike;
}

function resolveFlowStage(
  stage: TravelProjectFlowStage | null | undefined,
): TravelProjectFlowStage {
  return stage ?? "workspace_ready";
}

async function getAuthorizedClient(
  dependencies: WorkspaceProjectContextDependencies,
) {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    fetcher: (dependencies.fetcher ?? fetch).bind(globalThis),
  };
}

export function touchWorkspaceProjectContext(storage?: StorageLike) {
  const session = getProjectSession(storage);

  if (!session?.projectId) {
    return null;
  }

  return mergeProjectSession(
    {
      projectId: session.projectId,
      versionId: session.versionId,
      sourceType: session.sourceType,
      flowStage: session.flowStage,
    },
    storage,
  );
}

export interface WorkspaceVersionHandoffInput {
  versionId: string;
  tripPlan?: TripPlan | null;
}

/**
 * Revision Mode 编辑模式进入工作台前的交接：把选中的版本号写回 session，
 * 并把该版本已取回的 tripPlan 落到本地，让未登录/降级场景也能进对版本。
 *
 * 只做定位与落盘，不创建版本、不改动 tripPlan 内容。
 */
export function applyWorkspaceVersionHandoff(
  input: WorkspaceVersionHandoffInput,
  storage?: StorageLike,
) {
  const session = getProjectSession(storage);

  if (!session?.projectId || !input.versionId.trim()) {
    return null;
  }

  if (input.tripPlan) {
    try {
      saveTripPlan(input.tripPlan, storage);
    } catch (error) {
      // 本地落盘失败（例如该版本 tripPlan 结构不合当前 schema）不应挡住跳转，
      // 已登录场景下 Workspace 仍会按 session.versionId 重新拉取这一版。
      console.warn("[workspace-handoff] save trip plan failed", error);
    }
  }

  return mergeProjectSession(
    {
      projectId: session.projectId,
      versionId: input.versionId.trim(),
      sourceType: session.sourceType,
      flowStage: session.flowStage,
    },
    storage,
  );
}

export function loadWorkspaceLocalTripState(storage?: StorageLike) {
  return {
    tripPlan: loadTripPlan(storage),
    tripRequest: loadTripRequest(storage),
  };
}

export async function restoreWorkspaceProjectVersionContext(
  dependencies: WorkspaceProjectContextDependencies = {},
): Promise<WorkspaceProjectContext | null> {
  const session = getProjectSession(dependencies.storage);

  if (!session?.projectId) {
    return null;
  }

  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    return null;
  }

  const detailResponse = await client.fetcher(`/api/projects/${session.projectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
    },
  });

  if (!detailResponse.ok) {
    return null;
  }

  const detail = (await detailResponse.json()) as WorkspaceProjectDetailPayload;
  const flowStage = resolveFlowStage(
    detail.project?.currentFlowStage ?? session.flowStage,
  );
  const currentVersion = detail.currentVersion;
  let versionId = session.versionId ?? currentVersion?.id;
  let tripPlan = currentVersion?.tripPlan;
  let tripRequest = currentVersion?.tripRequestSnapshot ?? null;

  if (session.versionId && session.versionId !== currentVersion?.id) {
    const versionResponse = await client.fetcher(
      `/api/projects/${session.projectId}/versions/${session.versionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${client.accessToken}`,
        },
      },
    );

    if (!versionResponse.ok) {
      return null;
    }

    const versionPayload =
      (await versionResponse.json()) as WorkspaceProjectVersionPayload;
    versionId = versionPayload.version?.id;
    tripPlan = versionPayload.version?.tripPlan;
    tripRequest = versionPayload.version?.tripRequestSnapshot ?? null;
  }

  if (!versionId || !tripPlan) {
    return null;
  }

  saveTripPlan(tripPlan, dependencies.storage);

  if (tripRequest) {
    saveTripRequest(tripRequest, dependencies.storage);
  }

  mergeProjectSession(
    {
      projectId: session.projectId,
      versionId,
      sourceType: session.sourceType,
      flowStage,
    },
    dependencies.storage,
  );

  return {
    projectId: session.projectId,
    versionId,
    flowStage,
    tripPlan,
    tripRequest,
  };
}
