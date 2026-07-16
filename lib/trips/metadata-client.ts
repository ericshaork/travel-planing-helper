import { createSupabaseBrowserClient } from "../supabase/browser";
import { getBrowserAccessToken } from "../supabase/auth-client";
import type {
  SavedTripDetail,
  UpdateTripMetadataResponse,
} from "./types";

export interface SavedTripMetadataPatch {
  title?: string;
  status?: "draft" | "saved" | "archived";
  source_type?: "ai_generated" | "blank_manual" | "explore_import";
  trip_preferences_json?: Record<string, unknown>;
  local_draft_id?: string | null;
  last_opened_at?: string | null;
}

interface UpdateTripErrorResponse {
  ok?: false;
  message?: string;
  error?: {
    message?: string;
  };
}

function getErrorMessage(responseBody: UpdateTripMetadataResponse | UpdateTripErrorResponse | null) {
  return (
    (responseBody &&
    typeof responseBody === "object" &&
    "error" in responseBody
      ? responseBody.error?.message
      : undefined) ??
    (responseBody &&
    typeof responseBody === "object" &&
    "message" in responseBody
      ? responseBody.message
      : undefined) ??
    "暂时更新不了这条已保存计划，请稍后再试。"
  );
}

export async function patchSavedTripMetadata(
  tripId: string,
  patch: SavedTripMetadataPatch,
  options?: {
    fetchImpl?: typeof fetch;
    getAccessToken?: () => Promise<string | null>;
  },
) {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const getAccessToken =
    options?.getAccessToken ??
    (() => getBrowserAccessToken(createSupabaseBrowserClient()));
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("请先登录，再更新这条已保存计划。");
  }

  const response = await fetchImpl(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(patch),
  });
  const responseBody = (await response.json().catch(() => null)) as
    | UpdateTripMetadataResponse
    | UpdateTripErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody));
  }

  if (!responseBody || !("ok" in responseBody) || !responseBody.ok || !("trip" in responseBody)) {
    throw new Error("暂时更新不了这条已保存计划，请稍后再试。");
  }

  return responseBody.trip as SavedTripDetail;
}

export async function markSavedTripOpened(
  tripId: string,
  options?: {
    fetchImpl?: typeof fetch;
    getAccessToken?: () => Promise<string | null>;
    now?: () => string;
  },
) {
  return patchSavedTripMetadata(
    tripId,
    {
      last_opened_at: (options?.now ?? (() => new Date().toISOString()))(),
    },
    options,
  );
}
