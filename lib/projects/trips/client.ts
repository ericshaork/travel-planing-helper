import { getBrowserAccessToken } from "../../supabase/auth-client";
import { createSupabaseBrowserClient } from "../../supabase/browser";
import type { TravelProject } from "../types";

export interface ProjectMetadataPatch {
  title?: string;
  lifecycleState?: TravelProject["lifecycleState"];
}

interface ProjectResponsePayload {
  project?: TravelProject;
  error?: {
    message?: string;
  };
}

function getErrorMessage(payload: ProjectResponsePayload | null) {
  return (
    payload?.error?.message ??
    "暂时更新不了这个旅行项目，请稍后再试。"
  );
}

export async function patchProjectTrip(
  projectId: string,
  patch: ProjectMetadataPatch,
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
    throw new Error("请先登录，再更新这个旅行项目。");
  }

  const response = await fetchImpl(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(patch),
  });
  const payload = (await response.json().catch(() => null)) as
    | ProjectResponsePayload
    | null;

  if (!response.ok || !payload?.project) {
    throw new Error(getErrorMessage(payload));
  }

  return payload.project;
}
