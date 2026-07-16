import type { AuthStatusState } from "../supabase/auth-client";
import type { SaveActionState } from "../trips/save-status";

export type WorkspaceSidebarVisualKey =
  | "new-trip"
  | "trips"
  | "explore"
  | "saved"
  | "route"
  | "edit"
  | "export"
  | "settings";

const sidebarAccentMap: Record<WorkspaceSidebarVisualKey, string> = {
  "new-trip": "/images/icons/hover/create-hover.png",
  trips: "/images/icons/hover/trips-hover.png",
  explore: "/images/icons/hover/explore-hover.png",
  saved: "/images/icons/hover/explore-hover.png",
  route: "/images/icons/hover/workspace-hover.png",
  edit: "/images/icons/hover/workspace-hover.png",
  export: "/images/icons/hover/workspace-hover.png",
  settings: "/images/icons/hover/workspace-hover.png",
};

export interface WorkspaceSaveVisualMeta {
  label: string;
  tone: "success" | "pending" | "error";
  imageSrc: string;
}

export function getWorkspaceSidebarAccent(itemId: WorkspaceSidebarVisualKey) {
  return sidebarAccentMap[itemId];
}

export function getWorkspaceSaveVisualMeta(params: {
  authStatus: AuthStatusState["status"];
  actionState: SaveActionState;
  hasSavedTrip: boolean;
}) {
  const { authStatus, actionState, hasSavedTrip } = params;

  if (
    actionState === "saving" ||
    actionState === "updating" ||
    authStatus === "loading"
  ) {
    return {
      label: "保存中",
      tone: "pending",
      imageSrc: "/images/ui/state/save-pending-accent.png",
    } satisfies WorkspaceSaveVisualMeta;
  }

  if (actionState === "saved" || actionState === "updated") {
    return {
      label: "已保存",
      tone: "success",
      imageSrc: "/images/ui/state/save-success-accent.png",
    } satisfies WorkspaceSaveVisualMeta;
  }

  if (actionState === "error") {
    return {
      label: "需要处理",
      tone: "error",
      imageSrc: "/images/ui/state/save-error-accent.png",
    } satisfies WorkspaceSaveVisualMeta;
  }

  if (hasSavedTrip) {
    return {
      label: "已保存草稿",
      tone: "success",
      imageSrc: "/images/ui/state/save-success-accent.png",
    } satisfies WorkspaceSaveVisualMeta;
  }

  if (authStatus === "anonymous") {
    return {
      label: "登录后保存",
      tone: "pending",
      imageSrc: "/images/ui/state/save-pending-accent.png",
    } satisfies WorkspaceSaveVisualMeta;
  }

  return {
    label: "可保存",
    tone: "pending",
    imageSrc: "/images/ui/state/save-pending-accent.png",
  } satisfies WorkspaceSaveVisualMeta;
}
