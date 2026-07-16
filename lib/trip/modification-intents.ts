import { getTimeSlotLabel, type ItineraryBlockRef } from "./itinerary-view";
import type { ItineraryItemType } from "./types";

export type BlockActionType =
  | "remove"
  | "replace"
  | "lock"
  | "addSimilar"
  | "adjust";
export type PendingChangeAction = Exclude<BlockActionType, "remove">;

export type QuickModificationType =
  | "relax"
  | "lessWalking"
  | "lowerBudget"
  | "addFoodNightMarket"
  | "noEarlyStart";

export interface PendingChangeItem {
  id: string;
  action: PendingChangeAction;
  day: number;
  slot: ItineraryBlockRef["slot"];
  itemIndex: number;
  placeName: string;
  type?: ItineraryItemType;
  label: string;
  summary: string;
  requestText: string;
}

interface BlockLike {
  ref: Pick<
    ItineraryBlockRef,
    "day" | "slot" | "itemIndex" | "placeName"
  > & {
    type?: ItineraryItemType;
  };
  item?: {
    type?: ItineraryItemType;
  };
}

const ITEM_TYPE_LABELS: Partial<Record<ItineraryItemType, string>> = {
  attraction: "景点安排",
  food: "美食安排",
  transport: "交通安排",
  hotel: "住宿安排",
  free_time: "自由活动",
  shopping: "逛街安排",
  other: "行程安排",
};

const ACTION_LABELS: Record<PendingChangeAction, string> = {
  replace: "让 AI 换一个",
  lock: "保留当前安排",
  addSimilar: "让 AI 加类似",
  adjust: "让 AI 调整",
};

function getItemLabel(type?: ItineraryItemType): string {
  return ITEM_TYPE_LABELS[type ?? "other"] ?? "行程安排";
}

function getBlockContext(block: BlockLike): string {
  const slotLabel = getTimeSlotLabel(block.ref.slot);

  return `第 ${block.ref.day} 天${slotLabel}的「${block.ref.placeName}」`;
}

function buildPendingChangeId(
  action: PendingChangeAction,
  block: BlockLike,
): string {
  return `block:${block.ref.day}:${block.ref.slot}:${block.ref.itemIndex}:${action}`;
}

function buildPendingChangeRequestLine(
  action: PendingChangeAction,
  block: BlockLike,
): string {
  const context = getBlockContext(block);
  const itemLabel = getItemLabel(block.item?.type ?? block.ref.type);

  switch (action) {
    case "replace":
      return `请把 ${context} 换成一个更符合偏好、但节奏相近的${itemLabel}。`;
    case "lock":
      return `请保留 ${context}，重生成时不要移除它。`;
    case "addSimilar":
      return `请补一个和 ${context} 气质接近、路线也顺路的${itemLabel}。`;
    case "adjust":
      return `请围绕 ${context} 重新微调这一天的安排，让路线更顺、节奏更自然。`;
  }
}

export function getBlockActionLabel(action: PendingChangeAction): string {
  return ACTION_LABELS[action];
}

export function buildPendingChangeItem(
  action: PendingChangeAction,
  block: BlockLike,
): PendingChangeItem {
  const slotLabel = getTimeSlotLabel(block.ref.slot);
  const type = block.item?.type ?? block.ref.type;

  return {
    id: buildPendingChangeId(action, block),
    action,
    day: block.ref.day,
    slot: block.ref.slot,
    itemIndex: block.ref.itemIndex,
    placeName: block.ref.placeName,
    type,
    label: getBlockActionLabel(action),
    summary: `第 ${block.ref.day} 天 · ${slotLabel} · ${block.ref.placeName}`,
    requestText: buildPendingChangeRequestLine(action, block),
  };
}

export function addPendingChangeItem(
  current: readonly PendingChangeItem[],
  next: PendingChangeItem,
): PendingChangeItem[] {
  const index = current.findIndex((item) => item.id === next.id);

  if (index === -1) {
    return [...current, next];
  }

  return current.map((item, itemIndex) =>
    itemIndex === index ? next : item,
  );
}

export function removePendingChangeItem(
  current: readonly PendingChangeItem[],
  id: string,
): PendingChangeItem[] {
  return current.filter((item) => item.id !== id);
}

export function buildPendingChangesRequest(
  items: readonly PendingChangeItem[],
): string {
  if (items.length === 0) {
    return "";
  }

  const lines = items.map((item, index) => `${index + 1}. ${item.requestText}`);

  return [
    "请基于当前方案重新生成，并处理下面这些 AI 调整要求：",
    ...lines,
    "同时保持每天路线顺路，不要把节奏排得太满。",
  ].join("\n");
}

export function mergeModificationRequest(
  currentDraft: string,
  compiledChanges: string,
): string {
  const trimmedDraft = currentDraft.trim();
  const trimmedCompiled = compiledChanges.trim();

  if (!trimmedCompiled) {
    return trimmedDraft;
  }

  if (!trimmedDraft) {
    return trimmedCompiled;
  }

  return `${trimmedDraft}\n\n另外，请一起处理这些 AI 调整要求：\n${trimmedCompiled}`;
}

export function buildQuickModificationRequest(
  type: QuickModificationType,
): string {
  switch (type) {
    case "relax":
      return "请把这版行程整体放轻松一点，每天少安排一些，留出更多休息和自由活动时间，但保留最值得去的体验。";
    case "lessWalking":
      return "请把这版行程改得少走路一点，尽量安排顺路、少折返、少跨区域移动。";
    case "lowerBudget":
      return "请把这版行程的预算再压低一点，优先保留性价比高的安排，减少花费偏高但必要性不强的项目。";
    case "addFoodNightMarket":
      return "请在不把行程塞太满的前提下，多加一些本地美食、夜市或适合晚上去的小吃安排。";
    case "noEarlyStart":
      return "请把这版行程改成不用太早出门的节奏，上午安排轻松一点，尽量不要早起赶行程。";
  }
}
