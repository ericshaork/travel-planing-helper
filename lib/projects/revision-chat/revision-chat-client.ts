"use client";

import { getBrowserAccessToken } from "../../supabase/auth-client";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "../dev-bypass";
import type { ApiErrorResponse } from "../../utils/errors";
import {
  revisionChatResponseSchema,
  type RevisionChatHistoryMessage,
  type RevisionChatResponse,
} from "./revision-chat-types";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface SendRevisionChatMessageInput {
  projectId: string;
  versionId: string;
  message: string;
  history?: RevisionChatHistoryMessage[];
}

export interface SendRevisionChatMessageOptions {
  fetcher?: FetchLike;
  getAccessToken?: () => Promise<string | null>;
  allowGuestProjectAccess?: boolean;
}

export async function sendRevisionChatMessage(
  input: SendRevisionChatMessageInput,
  options: SendRevisionChatMessageOptions = {},
): Promise<RevisionChatResponse> {
  const fetcher = options.fetcher ?? fetch;
  const getAccessToken = options.getAccessToken ?? getBrowserAccessToken;
  const accessToken = await getAccessToken().catch(() => null);
  const allowGuestProjectAccess =
    options.allowGuestProjectAccess ??
    shouldSendDevelopmentGuestProjectHeader();

  if (!accessToken && !allowGuestProjectAccess) {
    throw new Error("Login is required before chatting with the AI.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (allowGuestProjectAccess) {
    headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
  }

  const response = await fetcher(
    `/api/projects/${input.projectId}/revision-chat`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: input.message,
        versionId: input.versionId,
        ...(input.history ? { history: input.history } : {}),
      }),
    },
  );
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const apiError = payload as Partial<ApiErrorResponse>;
    throw new Error(
      apiError.error?.message ??
        "AI 修改建议这次没有返回，可以稍后再试。",
    );
  }

  const parsed = revisionChatResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("AI 修改建议返回结构不正确。");
  }

  return parsed.data;
}
