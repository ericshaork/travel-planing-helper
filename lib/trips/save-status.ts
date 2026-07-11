import type { SavedTripMetadata } from "../trip/storage";
import type { AuthStatusState } from "../supabase/auth-client";

export type SaveActionState =
  | "idle"
  | "saving"
  | "saved"
  | "updating"
  | "updated"
  | "error";

export function getSaveButtonCopy(
  authStatus: AuthStatusState["status"],
  actionState: SaveActionState,
  metadata: SavedTripMetadata | null,
  errorMessage?: string,
) {
  const hasSavedTripId = Boolean(metadata?.savedTripId);

  if (actionState === "saving") {
    return {
      label: "保存中...",
      message: "正在把当前方案写进你的账户。",
    };
  }

  if (actionState === "updating") {
    return {
      label: "更新中...",
      message: "正在更新这条已保存计划。",
    };
  }

  if (actionState === "saved") {
    return {
      label: "已保存",
      message: "这版方案已经保存到我的行程。",
    };
  }

  if (actionState === "updated") {
    return {
      label: "已更新",
      message: "这条已保存计划刚刚更新过。",
    };
  }

  if (actionState === "error") {
    return {
      label: hasSavedTripId ? "更新已保存计划" : "保存计划",
      message:
        errorMessage?.trim() ||
        (hasSavedTripId
          ? "暂时更新不了这条已保存计划，请稍后再试。"
          : "当前方案暂时没保存成功，请稍后再试。"),
    };
  }

  if (authStatus === "anonymous") {
    return {
      label: "登录后保存",
      message: hasSavedTripId
        ? "登录后可继续更新这条已保存计划。"
        : "登录后把这版方案存到我的行程。",
    };
  }

  if (hasSavedTripId && metadata?.restoredAt) {
    return {
      label: "更新已保存计划",
      message: "当前这版是从我的行程打开的，可以继续更新这一条。",
    };
  }

  if (hasSavedTripId) {
    return {
      label: "更新已保存计划",
      message: "当前这版已经绑定到一条云端记录。",
    };
  }

  return {
    label: "保存计划",
    message: "当前这版还没保存到我的行程。",
  };
}
