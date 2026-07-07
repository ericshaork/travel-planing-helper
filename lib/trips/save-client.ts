import { createSupabaseBrowserClient } from "../supabase/browser";
import { getBrowserAccessToken } from "../supabase/auth-client";
import type { SaveTripRequestPayload, SaveTripResponse } from "./types";

interface SaveTripErrorResponse {
  error?: {
    message?: string;
  };
}

export function buildSaveTripLoginHref(returnTo = "/result") {
  const params = new URLSearchParams({
    returnTo,
  });

  return `/login?${params.toString()}`;
}

export async function saveTripToCloud(
  payload: SaveTripRequestPayload,
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
    throw new Error("请先登录，再把当前方案保存到云端。");
  }

  const response = await fetchImpl("/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const responseBody = (await response.json().catch(() => null)) as
    | SaveTripResponse
    | SaveTripErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      (responseBody &&
      typeof responseBody === "object" &&
      "error" in responseBody
        ? responseBody.error?.message
        : undefined) ??
        "当前方案暂时没保存成功，请稍后再试。",
    );
  }

  return responseBody as SaveTripResponse;
}
