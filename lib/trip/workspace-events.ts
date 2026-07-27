import type { PoiCandidate } from "../poi/types";
import type { ItineraryItem, ItineraryItemType } from "./types";
import type { ItineraryBlockUpdate } from "./itinerary-view";

export interface WorkspaceCreateEventInput {
  placeName: string;
  type: ItineraryItemType;
  timeLabel?: string;
  note?: string;
  sourceCandidate?: PoiCandidate;
}

export interface WorkspaceEventTypeOption {
  value: ItineraryItemType;
  label: string;
}

export const WORKSPACE_EVENT_TYPE_OPTIONS: WorkspaceEventTypeOption[] = [
  { value: "attraction", label: "景点" },
  { value: "food", label: "餐饮" },
  { value: "hotel", label: "住宿" },
  { value: "transport", label: "交通" },
  { value: "shopping", label: "购物" },
  { value: "other", label: "其他" },
];

export const WORKSPACE_EVENT_TIME_OPTIONS = Array.from(
  { length: (24 - 6) * 2 + 1 },
  (_, index) => {
    const minutes = 6 * 60 + index * 30;
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(restMinutes).padStart(2, "0")}`;
  },
);

function normalizeTimeText(value?: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  return WORKSPACE_EVENT_TIME_OPTIONS.includes(trimmed) ? trimmed : "";
}

export function parseWorkspaceEventTimeLabel(
  timeLabel?: string,
  fallbackTimeLabel?: string,
) {
  const source = timeLabel?.trim() || fallbackTimeLabel?.trim() || "";
  const [rawStart = "", rawEnd = ""] = source
    .replace(/\s+/g, "")
    .split(/[-~–—]/);
  const startTime = normalizeTimeText(rawStart);
  const endTime = normalizeTimeText(rawEnd);

  if (startTime && endTime && startTime < endTime) {
    return { startTime, endTime };
  }

  if (startTime) {
    const startIndex = WORKSPACE_EVENT_TIME_OPTIONS.indexOf(startTime);
    const fallbackEnd =
      WORKSPACE_EVENT_TIME_OPTIONS[
        Math.min(startIndex + 3, WORKSPACE_EVENT_TIME_OPTIONS.length - 1)
      ];

    return { startTime, endTime: fallbackEnd ?? "12:00" };
  }

  return { startTime: "10:00", endTime: "11:30" };
}

export function formatWorkspaceEventTimeLabel(
  startTime: string,
  endTime: string,
) {
  return `${startTime}-${endTime}`;
}

export function normalizeWorkspaceCreateEventInput(
  input: WorkspaceCreateEventInput,
): WorkspaceCreateEventInput | null {
  const placeName = input.placeName.trim();

  if (!placeName) {
    return null;
  }

  return {
    placeName,
    type: input.type,
    ...(input.timeLabel?.trim() ? { timeLabel: input.timeLabel.trim() } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(input.sourceCandidate ? { sourceCandidate: input.sourceCandidate } : {}),
  };
}

export function createWorkspaceEventInputFromPoiCandidate(input: {
  candidate: PoiCandidate;
  timeLabel?: string;
  note?: string;
  type?: ItineraryItemType;
}): WorkspaceCreateEventInput {
  return {
    placeName: input.candidate.name,
    type: input.type ?? "attraction",
    ...(input.timeLabel?.trim() ? { timeLabel: input.timeLabel.trim() } : {}),
    note:
      input.note?.trim() ||
      (input.candidate.address ? `参考位置：${input.candidate.address}` : ""),
    sourceCandidate: input.candidate,
  };
}

export function createWorkspaceItineraryItem(input: {
  event: WorkspaceCreateEventInput;
  editorId: string;
  editorSlotId: string;
  fallbackTimeLabel?: string;
}): ItineraryItem | null {
  const normalizedEvent = normalizeWorkspaceCreateEventInput(input.event);

  if (!normalizedEvent) {
    return null;
  }

  const timeLabel =
    normalizedEvent.timeLabel ?? input.fallbackTimeLabel?.trim() ?? undefined;
  const note = normalizedEvent.note;

  return {
    ...(timeLabel ? { timeLabel } : {}),
    placeName: normalizedEvent.placeName,
    type: normalizedEvent.type,
    reason: note || "先把这一站放进行程，后续可以继续补充路线和提醒。",
    guide: [
      note || "这是一条手动添加的旅行事件，可以继续编辑备注、交通和停留时间。",
    ],
    editorId: input.editorId,
    editorSlotId: input.editorSlotId,
  };
}

export function applyWorkspaceItineraryItemUpdate(
  item: ItineraryItem,
  updates: ItineraryBlockUpdate,
): ItineraryItem | null {
  const placeName = updates.placeName.trim();
  const reason = updates.reason.trim();
  const timeLabel = updates.timeLabel?.trim();

  if (!placeName || !reason) {
    return null;
  }

  return {
    ...item,
    placeName,
    type: updates.type,
    ...(timeLabel ? { timeLabel } : { timeLabel: undefined }),
    reason,
  };
}
