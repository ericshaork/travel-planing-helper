"use client";

import { getBrowserAccessToken } from "../../supabase/auth-client";
import { mergeProjectSession, getProjectSession } from "../session";
import { postGenerateTrip } from "../../ai/generate-client";
import { workspaceAiResponseSchema } from "./workspace-ai-types";
import type { GenerateTripResponse, TripPlan, TripRequest } from "../../trip/types";
import type { ApiErrorResponse } from "../../utils/errors";
import type { WorkspaceAiGenerationResult } from "./workspace-ai-types";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface RegenerateWorkspaceTripInput {
  tripPlan: TripPlan;
  tripRequest: TripRequest;
  modificationRequest: string;
}

interface RegenerateWorkspaceTripOptions {
  fetchImpl?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
}

interface WorkspaceAiRequestInput {
  projectId: string;
  versionId: string;
  modificationRequest: string;
}

interface WorkspaceAiRequestOptions {
  fetchImpl?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  updateSession?: boolean;
}

async function requestWorkspaceAiRoute(
  input: WorkspaceAiRequestInput,
  options: WorkspaceAiRequestOptions = {},
): Promise<WorkspaceAiGenerationResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const getAccessToken = options.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);

  if (!accessToken) {
    throw new Error("Login is required before using Workspace AI.");
  }

  const response = await fetchImpl(
    `/api/projects/${input.projectId}/workspace-ai`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        versionId: input.versionId,
        modificationRequest: input.modificationRequest,
      }),
    },
  );
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const apiError = payload as Partial<ApiErrorResponse>;
    throw new Error(apiError.error?.message ?? "Unable to regenerate trip.");
  }

  const parsed = workspaceAiResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Workspace AI response is invalid.");
  }

  if (options.updateSession !== false) {
    mergeProjectSession({
      projectId: parsed.data.projectId,
      versionId: parsed.data.versionId,
      flowStage: parsed.data.stage,
    });
  }

  return parsed.data;
}

export async function requestWorkspaceAiModification(
  input: WorkspaceAiRequestInput,
  options: Omit<WorkspaceAiRequestOptions, "updateSession"> = {},
): Promise<WorkspaceAiGenerationResult> {
  return requestWorkspaceAiRoute(input, {
    ...options,
    updateSession: false,
  });
}

export async function regenerateWorkspaceTrip(
  input: RegenerateWorkspaceTripInput,
  options: RegenerateWorkspaceTripOptions = {},
): Promise<GenerateTripResponse> {
  const session = getProjectSession();

  if (!session?.projectId || !session.versionId) {
    const fallbackResponse = await postGenerateTrip(
      {
        tripRequest: input.tripRequest,
        previousPlan: input.tripPlan,
        modificationRequest: input.modificationRequest,
      },
      {
        fetchImpl: options.fetchImpl,
        getAccessToken: options.getAccessToken,
      },
    );
    const fallbackPayload = (await fallbackResponse.json()) as unknown;

    if (!fallbackResponse.ok) {
      const apiError = fallbackPayload as Partial<ApiErrorResponse>;
      throw new Error(apiError.error?.message ?? "Unable to regenerate trip.");
    }

    return fallbackPayload as GenerateTripResponse;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const getAccessToken = options.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);

  if (!accessToken) {
    const fallbackResponse = await postGenerateTrip(
      {
        tripRequest: input.tripRequest,
        previousPlan: input.tripPlan,
        modificationRequest: input.modificationRequest,
      },
      {
        fetchImpl,
        getAccessToken: async () => null,
      },
    );
    const fallbackPayload = (await fallbackResponse.json()) as unknown;

    if (!fallbackResponse.ok) {
      const apiError = fallbackPayload as Partial<ApiErrorResponse>;
      throw new Error(apiError.error?.message ?? "Unable to regenerate trip.");
    }

    return fallbackPayload as GenerateTripResponse;
  }

  const parsed = await requestWorkspaceAiRoute(
    {
      projectId: session.projectId,
      versionId: session.versionId,
      modificationRequest: input.modificationRequest,
    },
    {
      fetchImpl,
      getAccessToken: async () => accessToken,
      updateSession: true,
    },
  );

  return {
    tripPlan: parsed.tripPlan,
    appliedChanges: parsed.appliedChanges,
    warnings: parsed.warnings,
  };
}
