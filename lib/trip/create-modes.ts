export type CreateModeId = "ai-assisted" | "self-directed";

export interface CreateModeOption {
  id: CreateModeId;
  title: string;
  eyebrow: string;
  description: string;
  available: boolean;
  statusLabel: string;
}

export const CREATE_MODE_OPTIONS: CreateModeOption[] = [
  {
    id: "ai-assisted",
    eyebrow: "AI",
    title: "AI 帮我先排一版",
    description:
      "告诉我目的地、天数、预算和偏好，我先给你一版可继续修改的行程。",
    available: true,
    statusLabel: "可用",
  },
  {
    id: "self-directed",
    eyebrow: "BLANK",
    title: "我想从空白计划开始",
    description:
      "直接进入空白 Workspace，先手动补 Day、地点和路线，后面再慢慢整理。",
    available: true,
    statusLabel: "可用",
  },
];

export function getCreateModeOption(modeId: CreateModeId): CreateModeOption {
  const option = CREATE_MODE_OPTIONS.find((item) => item.id === modeId);

  return option ?? CREATE_MODE_OPTIONS[0]!;
}
