"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "./dev-bypass";
import {
  getProjectSession,
  mergeProjectSession,
  type TravelProjectSession,
  type TravelProjectSessionSourceType,
} from "./session";
import type { TravelProjectFlowStage, TravelProjectMessage } from "./types";
import type { ApiErrorResponse } from "../utils/errors";
import {
  ensureWorkspaceSessionMetadata,
  saveTripPlan,
  saveTripRequest,
  type StorageLike,
  type WorkspaceSessionSourceType,
} from "../trip/storage";
import type { TripPlan, TripRequest } from "../trip/types";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface CreateCopilotProjectDetail {
  project: {
    id: string;
    title: string;
    currentFlowStage?: TravelProjectFlowStage | null;
  };
}

export interface CreateCopilotRestoreResult {
  projectId: string;
  flowStage: TravelProjectFlowStage;
  messages: TravelProjectMessage[];
}

export interface CreateCopilotSendResult {
  projectId: string;
  flowStage: TravelProjectFlowStage;
  reply: string;
}

export interface CreateProposalAdjustResult {
  projectId: string;
  flowStage: TravelProjectFlowStage;
}

export interface CreateProposalGenerateResult {
  projectId: string;
  flowStage: TravelProjectFlowStage;
  versionId: string;
  tripRequest: TripRequest;
  tripPlan: TripPlan;
}

export interface PersistProjectMessageResult {
  message: TravelProjectMessage;
}

export interface PatchProjectFlowStageResult {
  projectId: string;
  flowStage: TravelProjectFlowStage;
}

export interface CreateCopilotClientDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  storage?: StorageLike;
  allowGuestProjectAccess?: boolean;
}

function responseErrorMessage(payload: unknown, fallback: string) {
  const response = payload as Partial<ApiErrorResponse>;
  return response.error?.message ?? fallback;
}

function resolveWorkspaceSourceTypeFromSession(
  sourceType: TravelProjectSessionSourceType | undefined,
): WorkspaceSessionSourceType {
  if (sourceType === "explore_import" || sourceType === "explore_archive") {
    return "explore_import";
  }
  if (sourceType === "blank_manual") {
    return "blank_manual";
  }
  if (sourceType === "legacy_import" || sourceType === "existing_trip") {
    return "saved_trip";
  }
  return "ai_generated";
}

function resolveFlowStage(
  stage: TravelProjectFlowStage | null | undefined,
): TravelProjectFlowStage {
  return stage ?? "source_received";
}

async function getAuthorizedClient(
  dependencies: CreateCopilotClientDependencies,
) {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);
  const allowGuestProjectAccess =
    dependencies.allowGuestProjectAccess ??
    shouldSendDevelopmentGuestProjectHeader();

  if (!accessToken && !allowGuestProjectAccess) {
    return null;
  }

  return {
    accessToken,
    fetcher: (dependencies.fetcher ?? fetch).bind(globalThis),
    allowGuestProjectAccess,
  };
}

function buildProjectRequestHeaders(
  accessToken: string | null,
  allowGuestProjectAccess: boolean,
  includeJson = false,
) {
  const headers: Record<string, string> = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (allowGuestProjectAccess) {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  return headers;
}

export async function restoreCreateCopilotSession(
  dependencies: CreateCopilotClientDependencies = {},
): Promise<CreateCopilotRestoreResult | null> {
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
    headers: buildProjectRequestHeaders(
      client.accessToken,
      client.allowGuestProjectAccess,
    ),
  });

  if (!detailResponse.ok) {
    return null;
  }

  const detail = (await detailResponse.json()) as CreateCopilotProjectDetail;
  const messagesResponse = await client.fetcher(
    `/api/projects/${session.projectId}/messages?limit=50`,
    {
      method: "GET",
      headers: buildProjectRequestHeaders(
        client.accessToken,
        client.allowGuestProjectAccess,
      ),
    },
  );

  if (!messagesResponse.ok) {
    return null;
  }

  const payload = (await messagesResponse.json()) as {
    messages?: TravelProjectMessage[];
  };
  const flowStage = resolveFlowStage(
    detail.project.currentFlowStage ?? session.flowStage,
  );

  mergeProjectSession({
    projectId: session.projectId,
    sourceType: session.sourceType,
    flowStage,
  }, dependencies.storage);

  return {
    projectId: session.projectId,
    flowStage,
    messages: payload.messages ?? [],
  };
}

export async function sendCreateCopilotMessage(
  projectId: string,
  message: string,
  dependencies: CreateCopilotClientDependencies = {},
): Promise<CreateCopilotSendResult> {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    throw new Error("Login is required before continuing the AI planning flow.");
  }

  const response = await client.fetcher(`/api/projects/${projectId}/copilot`, {
    method: "POST",
    headers: buildProjectRequestHeaders(
      client.accessToken,
      client.allowGuestProjectAccess,
      true,
    ),
    body: JSON.stringify({
      message,
    }),
  });
  const payload = (await response.json()) as {
    projectId?: string;
    stage?: TravelProjectFlowStage;
    reply?: string;
  };

  if (!response.ok || !payload.projectId || !payload.stage || !payload.reply) {
    throw new Error(
      responseErrorMessage(
        payload,
        "The AI planning assistant could not continue right now.",
      ),
    );
  }

  mergeProjectSession({
    projectId: payload.projectId,
    flowStage: payload.stage,
  }, dependencies.storage);

  return {
    projectId: payload.projectId,
    flowStage: payload.stage,
    reply: payload.reply,
  };
}

export async function moveCreateProposalToAdjusting(
  projectId: string,
  dependencies: CreateCopilotClientDependencies = {},
): Promise<CreateProposalAdjustResult> {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    throw new Error("Login is required before adjusting the proposal.");
  }

  const response = await client.fetcher(`/api/projects/${projectId}/proposal`, {
    method: "POST",
    headers: buildProjectRequestHeaders(
      client.accessToken,
      client.allowGuestProjectAccess,
      true,
    ),
    body: JSON.stringify({
      action: "adjust",
    }),
  });
  const payload = (await response.json()) as {
    projectId?: string;
    stage?: TravelProjectFlowStage;
  };

  if (!response.ok || !payload.projectId || !payload.stage) {
    throw new Error(
      responseErrorMessage(
        payload,
        "The proposal could not switch back to adjusting.",
      ),
    );
  }

  mergeProjectSession(
    {
      projectId: payload.projectId,
      flowStage: payload.stage,
    },
    dependencies.storage,
  );

  return {
    projectId: payload.projectId,
    flowStage: payload.stage,
  };
}

export async function generateCreateProposal(
  projectId: string,
  dependencies: CreateCopilotClientDependencies = {},
): Promise<CreateProposalGenerateResult> {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    throw new Error("Login is required before generating the full trip plan.");
  }

  const response = await client.fetcher(`/api/projects/${projectId}/proposal`, {
    method: "POST",
    headers: buildProjectRequestHeaders(
      client.accessToken,
      client.allowGuestProjectAccess,
      true,
    ),
    body: JSON.stringify({
      action: "generate",
    }),
  });
  const payload = (await response.json()) as {
    tripRequest?: TripRequest;
    tripPlan?: TripPlan;
    versionId?: string;
    stage?: TravelProjectFlowStage;
  };

  if (
    !response.ok ||
    !payload.tripRequest ||
    !payload.tripPlan ||
    !payload.versionId ||
    !payload.stage
  ) {
    throw new Error(
      responseErrorMessage(
        payload,
        "The full trip plan could not be generated yet.",
      ),
    );
  }

  saveTripRequest(payload.tripRequest, dependencies.storage);
  saveTripPlan(payload.tripPlan, dependencies.storage);
  const existingSession = getProjectSession(dependencies.storage);
  ensureWorkspaceSessionMetadata(
    {
      sourceType: resolveWorkspaceSourceTypeFromSession(
        existingSession?.sourceType,
      ),
      workspaceModeDefault: "read",
    },
    dependencies.storage,
  );
  mergeProjectSession(
    {
      projectId,
      versionId: payload.versionId,
      flowStage: payload.stage,
    },
    dependencies.storage,
  );

  return {
    projectId,
    flowStage: payload.stage,
    versionId: payload.versionId,
    tripRequest: payload.tripRequest,
    tripPlan: payload.tripPlan,
  };
}

export async function persistProjectMessage(
  projectId: string,
  input: { role: "user" | "assistant" | "system"; content: string },
  dependencies: CreateCopilotClientDependencies = {},
): Promise<PersistProjectMessageResult> {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    throw new Error("Login is required before persisting a project message.");
  }

  const response = await client.fetcher(`/api/projects/${projectId}/messages`, {
    method: "POST",
    headers: buildProjectRequestHeaders(
      client.accessToken,
      client.allowGuestProjectAccess,
      true,
    ),
    body: JSON.stringify({
      role: input.role,
      content: input.content,
    }),
  });
  const payload = (await response.json()) as {
    messages?: TravelProjectMessage[];
  };

  if (
    !response.ok ||
    !Array.isArray(payload.messages) ||
    payload.messages.length === 0
  ) {
    throw new Error(
      responseErrorMessage(
        payload,
        "The project message could not be saved right now.",
      ),
    );
  }

  return {
    message: payload.messages[0],
  };
}

export async function patchProjectFlowStage(
  projectId: string,
  stage: TravelProjectFlowStage,
  dependencies: CreateCopilotClientDependencies = {},
): Promise<PatchProjectFlowStageResult> {
  const client = await getAuthorizedClient(dependencies);

  if (!client) {
    throw new Error(
      "Login is required before updating the project flow stage.",
    );
  }

  const response = await client.fetcher(`/api/projects/${projectId}/state`, {
    method: "PATCH",
    headers: buildProjectRequestHeaders(
      client.accessToken,
      client.allowGuestProjectAccess,
      true,
    ),
    body: JSON.stringify({
      currentFlowStage: stage,
      touchActivity: true,
    }),
  });
  const payload = (await response.json()) as {
    project?: { id?: string; currentFlowStage?: TravelProjectFlowStage | null };
  };

  if (!response.ok || !payload.project?.id) {
    throw new Error(
      responseErrorMessage(
        payload,
        "The project flow stage could not be updated right now.",
      ),
    );
  }

  const resolvedStage = resolveFlowStage(payload.project.currentFlowStage);

  mergeProjectSession(
    {
      projectId: payload.project.id,
      flowStage: resolvedStage,
    },
    dependencies.storage,
  );

  return {
    projectId: payload.project.id,
    flowStage: resolvedStage,
  };
}

export function getCreateCopilotStatusLabel(stage: TravelProjectFlowStage | null | undefined) {
  switch (stage) {
    case "source_review":
      return "正在了解需求";
    case "clarifying":
      return "正在补关键条件";
    case "proposal_ready":
      return "准备生成计划";
    case "proposal_adjusting":
      return "正在完善方案";
    case "generating":
      return "正在整理行程";
    case "workspace_ready":
      return "可以进入计划编辑";
    case "abandoned":
      return "上次规划已暂停";
    case "source_received":
    default:
      return "正在开始规划";
  }
}
