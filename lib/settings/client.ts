import { getBrowserAccessToken } from "../supabase/auth-client";
import { createSupabaseBrowserClient } from "../supabase/browser";
import { userSettingsSchema, type UserSettings } from "./types";

interface UserSettingsErrorResponse {
  error?: {
    message?: string;
  };
}

function getSettingsPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("settings" in payload)) {
    return undefined;
  }

  return payload.settings;
}

export async function getUserSettings(options?: { fetchImpl?: typeof fetch }) {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const accessToken = await getBrowserAccessToken(createSupabaseBrowserClient());

  if (!accessToken) {
    throw new Error("请先登录，再查看你的默认设置。");
  }

  const response = await fetchImpl("/api/user-settings", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | { settings?: unknown }
    | UserSettingsErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      (payload &&
      typeof payload === "object" &&
      "error" in payload
        ? payload.error?.message
        : undefined) ?? "暂时没读到你的默认偏好，请稍后再试。",
    );
  }

  const parsed = userSettingsSchema.safeParse(getSettingsPayload(payload));

  if (!parsed.success) {
    throw new Error("默认偏好返回格式不完整，请稍后再试。");
  }

  return parsed.data;
}

export async function updateUserSettings(
  settings: UserSettings,
  options?: { fetchImpl?: typeof fetch },
) {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const accessToken = await getBrowserAccessToken(createSupabaseBrowserClient());

  if (!accessToken) {
    throw new Error("请先登录，再更新你的默认设置。");
  }

  const response = await fetchImpl("/api/user-settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(settings),
  });
  const payload = (await response.json().catch(() => null)) as
    | { settings?: unknown }
    | UserSettingsErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      (payload &&
      typeof payload === "object" &&
      "error" in payload
        ? payload.error?.message
        : undefined) ?? "暂时还没保存成功，请稍后再试。",
    );
  }

  const parsed = userSettingsSchema.safeParse(getSettingsPayload(payload));

  if (!parsed.success) {
    throw new Error("保存后的默认偏好返回格式不完整，请稍后再试。");
  }

  return parsed.data;
}
