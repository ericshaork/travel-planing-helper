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
    eyebrow: "MAP",
    title: "我想自己慢慢挑",
    description:
      "从地图和灵感地点开始挑选，之后再把地点加进行程里。",
    available: false,
    statusLabel: "v1.5",
  },
];

export function getCreateModeOption(modeId: CreateModeId): CreateModeOption {
  const option = CREATE_MODE_OPTIONS.find((item) => item.id === modeId);

  return option ?? CREATE_MODE_OPTIONS[0]!;
}
