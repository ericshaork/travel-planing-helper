"use client";

import { getBrowserAccessToken } from "../supabase/auth-client";
import type { CreateEntrySource } from "./create-entry";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "./dev-bypass";
import { ENTRY_SESSION_SOURCE_TYPES } from "./entry-client";
import {
  clearProjectSession,
  setProjectSession,
  type TravelProjectSession,
  type TravelProjectSessionSourceType,
} from "./session";
import type {
  TravelProjectFlowStage,
  TravelProjectSourceType,
} from "./types";
import type { StorageLike } from "../trip/storage";
import type { ParseTripResponse } from "../trip/types";
import type { ApiErrorResponse } from "../utils/errors";

const CREATE_PROJECT_FALLBACK_TITLE = "New travel project";

export interface CreateFlowInput {
  rawInput: string;
  selectedInterests: string[];
  selectedTravelStyles: string[];
  storage?: StorageLike;
  entrySource?: CreateEntrySource;
  archiveSlug?: string;
}

export interface CreateFlowResult {
  projectSession: TravelProjectSession | null;
  bootstrapReply?: string;
  /**
   * 建项目失败的真实原因。以前这里一律折叠成 null，
   * 调用方分不清「没登录」和「已登录但接口 401」，于是把已登录用户也送去登录页。
   */
  failureReason?: CreateFlowFailureReason;
  failureMessage?: string;
}

export type CreateFlowFailureReason = "no_auth" | "unauthorized";

interface ProjectCreatePayload {
  title: string;
  sourceType: Extract<TravelProjectSourceType, "blank_input" | "explore_archive">;
  initialMetadata: {
    lifecycleState: "planning";
    flowStage: "source_received";
    sourceTitle: string | null;
    sourcePayload: Record<string, unknown>;
  };
}

function resolveProjectSourceType(
  entrySource: CreateEntrySource | undefined,
): ProjectCreatePayload["sourceType"] {
  return entrySource === "explore_archive" ? "explore_archive" : "blank_input";
}

function resolveSessionSourceType(
  entrySource: CreateEntrySource | undefined,
): TravelProjectSessionSourceType {
  return entrySource === "explore_archive"
    ? ENTRY_SESSION_SOURCE_TYPES.exploreImport
    : ENTRY_SESSION_SOURCE_TYPES.aiPrompt;
}

interface ProjectCreateResponse {
  project?: {
    id?: string;
    currentFlowStage?: TravelProjectFlowStage | null;
  };
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface CreateFlowDependencies {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  allowGuestProjectAccess?: boolean;
}

function buildProjectRequestHeaders(
  accessToken: string | null,
  allowGuestProjectAccess: boolean,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (allowGuestProjectAccess) {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  return headers;
}

function buildResponseErrorMessage(payload: unknown, fallback: string) {
  const response = payload as Partial<ApiErrorResponse>;
  return response.error?.message ?? fallback;
}

function isUnauthorizedApiResponse(response: Response, payload: unknown) {
  const apiError = payload as Partial<ApiErrorResponse> | null;

  return response.status === 401 || apiError?.error?.code === "UNAUTHORIZED";
}

export function buildCreateFlowParseText(
  text: string,
  interests: string[],
  travelStyles: string[],
): string {
  const additions = [
    interests.length > 0 ? `喜欢${interests.join("、")}` : "",
    travelStyles.length > 0 ? `希望${travelStyles.join("、")}` : "",
  ].filter(Boolean);

  return additions.length > 0
    ? `${text.trim()}；补充偏好：${additions.join("；")}。`
    : text.trim();
}

function buildProjectTitle(rawInput: string) {
  const normalized = rawInput.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return CREATE_PROJECT_FALLBACK_TITLE;
  }

  return normalized.slice(0, 120);
}

function buildSourceTitle(rawInput: string) {
  const normalized = rawInput.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 160) : null;
}

type ProjectBootstrapOutcome =
  | {
      projectSession: TravelProjectSession;
      bootstrapReply: undefined;
      failureReason?: undefined;
      failureMessage?: undefined;
    }
  | {
      projectSession: null;
      bootstrapReply?: undefined;
      failureReason: CreateFlowFailureReason;
      failureMessage?: string;
    };

async function createProjectAndPersistFirstAnswer(
  input: CreateFlowInput & { parseText: string },
  dependencies: CreateFlowDependencies,
): Promise<ProjectBootstrapOutcome> {
  const getAccessToken = dependencies.getAccessToken ?? getBrowserAccessToken;
  const fetcher = dependencies.fetcher ?? fetch;
  const allowGuestProjectAccess =
    dependencies.allowGuestProjectAccess ??
    shouldSendDevelopmentGuestProjectHeader();
  const accessToken = await getAccessToken().catch(() => null);

  if (!accessToken && !allowGuestProjectAccess) {
    return {
      projectSession: null,
      failureReason: "no_auth",
    };
  }

  const projectPayload: ProjectCreatePayload = {
    title: buildProjectTitle(input.rawInput),
    sourceType: resolveProjectSourceType(input.entrySource),
    initialMetadata: {
      lifecycleState: "planning",
      flowStage: "source_received",
      sourceTitle: buildSourceTitle(input.rawInput),
      sourcePayload: {
        rawInput: input.rawInput,
        parseText: input.parseText,
        selectedInterests: input.selectedInterests,
        selectedTravelStyles: input.selectedTravelStyles,
        ...(input.entrySource === "explore_archive" && input.archiveSlug
          ? { archiveSlug: input.archiveSlug }
          : {}),
      },
    },
  };
  const createResponse = await fetcher("/api/projects", {
    method: "POST",
    headers: buildProjectRequestHeaders(accessToken, allowGuestProjectAccess),
    body: JSON.stringify(projectPayload),
  });
  const createPayload = (await createResponse.json()) as ProjectCreateResponse;

  if (!createResponse.ok) {
    if (isUnauthorizedApiResponse(createResponse, createPayload)) {
      return {
        projectSession: null,
        failureReason: "unauthorized",
        failureMessage: buildResponseErrorMessage(
          createPayload,
          "当前登录状态已经失效，请重新登录后再试。",
        ),
      };
    }

    throw new Error(
      buildResponseErrorMessage(
        createPayload,
        "AI 创建项目暂时没有成功，请稍后再试。",
      ),
    );
  }

  if (!createPayload.project?.id) {
    throw new Error("AI 创建项目返回不完整，暂时还不能继续。");
  }

  const projectId = createPayload.project.id;
  const flowStage: TravelProjectFlowStage =
    createPayload.project.currentFlowStage ?? "source_received";

  const messageResponse = await fetcher(
    `/api/projects/${projectId}/messages`,
    {
      method: "POST",
      headers: buildProjectRequestHeaders(accessToken, allowGuestProjectAccess),
      body: JSON.stringify({
        role: "user",
        content: input.parseText,
      }),
    },
  );

  if (!messageResponse.ok) {
    await messageResponse.json().catch(() => null);
  }

  return {
    projectSession: setProjectSession(
      {
        projectId,
        sourceType: resolveSessionSourceType(input.entrySource),
        flowStage,
      },
      input.storage,
    ),
    bootstrapReply: undefined,
  };
}

export async function submitCreateFlow(
  input: CreateFlowInput,
  dependencies: CreateFlowDependencies = {},
): Promise<CreateFlowResult> {
  const parseText = buildCreateFlowParseText(
    input.rawInput,
    input.selectedInterests,
    input.selectedTravelStyles,
  );

  clearProjectSession(input.storage);

  const bootstrap = await createProjectAndPersistFirstAnswer(
    {
      ...input,
      parseText,
    },
    dependencies,
  );

  return {
    projectSession: bootstrap.projectSession,
    bootstrapReply: bootstrap.bootstrapReply,
    failureReason: bootstrap.failureReason,
    failureMessage: bootstrap.failureMessage,
  };
}

export interface InterviewBootstrapPlan {
  rawInput: string | null;
  followUpAnswers: string[];
}

/**
 * 五问收集是本地先行的：项目可能还没建起来，答案先在队列里排队。
 * 建项目必须用第一个答案作为 rawInput，其余答案按原顺序补写，
 * 否则服务端的消息顺序会和用户真实的答题顺序错位。
 */
export function buildInterviewBootstrapPlan(
  firstAnswer: string | null,
  queuedAnswers: readonly string[],
): InterviewBootstrapPlan {
  const normalizedFirst = firstAnswer?.trim() ?? "";

  if (!normalizedFirst) {
    return { rawInput: null, followUpAnswers: [] };
  }

  return {
    rawInput: normalizedFirst,
    followUpAnswers: queuedAnswers
      .map((answer) => answer.trim())
      .filter((answer) => answer.length > 0),
  };
}

export interface SubmitInterviewParseTripInput {
  text: string;
}

export async function submitInterviewParseTrip(
  input: SubmitInterviewParseTripInput,
  dependencies: CreateFlowDependencies = {},
): Promise<ParseTripResponse> {
  const fetcher = dependencies.fetcher ?? fetch;
  const response = await fetcher("/api/parse-trip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: input.text }),
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(
      buildResponseErrorMessage(
        payload,
        "五问汇总没有解析成功，请稍后再试一次。",
      ),
    );
  }

  return payload as ParseTripResponse;
}
