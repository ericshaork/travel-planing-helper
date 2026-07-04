import { getTimeSlotLabel, type ItineraryBlockRef } from "./itinerary-view";
import type { ItineraryItemType } from "./types";

export type BlockActionType = "remove" | "replace" | "lock" | "addSimilar";
export type PendingChangeAction = BlockActionType;

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
  remove: "不要这个",
  replace: "换一个",
  lock: "一定保留",
  addSimilar: "加类似",
};

function getItemLabel(type?: ItineraryItemType): string {
  return ITEM_TYPE_LABELS[type ?? "other"] ?? "行程安排";
}

function getBlockContext(block: BlockLike): string {
  const slotLabel = getTimeSlotLabel(block.ref.slot);

  return `第 ${block.ref.day} 天${slotLabel}的「${block.ref.placeName}」`;
}

function getPendingBlockContext(block: BlockLike): string {
  const slotLabel = getTimeSlotLabel(block.ref.slot);

  return `Day ${block.ref.day} ${slotLabel}的「${block.ref.placeName}」`;
}

function buildPendingChangeId(
  action: PendingChangeAction,
  block: BlockLike,
): string {
  const actionKey = action === "addSimilar" ? "addSimilar" : "disposition";

  return `block:${block.ref.day}:${block.ref.slot}:${block.ref.itemIndex}:${actionKey}`;
}

function buildPendingChangeRequestLine(
  action: PendingChangeAction,
  block: BlockLike,
): string {
  const context = getPendingBlockContext(block);
  const itemLabel = getItemLabel(block.item?.type ?? block.ref.type);

  switch (action) {
    case "remove":
      return `请不要再安排 ${context} 这个${itemLabel}，并换成一个更符合偏好、路线更顺的安排。`;
    case "replace":
      return `请把 ${context}换成一个更符合偏好的同类安排。`;
    case "lock":
      return `请一定保留 ${context}。`;
    case "addSimilar":
      return `请增加一个和 ${context} 类似的地点或活动。`;
  }
}

export function getBlockActionLabel(action: PendingChangeAction): string {
  return ACTION_LABELS[action];
}

export function buildBlockModificationRequest(
  actionType: BlockActionType,
  block: BlockLike,
): string {
  const context = getBlockContext(block);
  const itemLabel = getItemLabel(block.item?.type ?? block.ref.type);

  switch (actionType) {
    case "remove":
      return `请不要再安排${context}这个${itemLabel}，并换成一个更符合我偏好、路线更顺的安排。`;
    case "replace":
      return `请把${context}换成一个同样适合这段行程、但更符合我偏好的${itemLabel}。`;
    case "lock":
      return `请一定保留${context}，重新生成时不要删掉它。`;
    case "addSimilar":
      return `请增加一个和${context}类似的${itemLabel}，同时保持整体路线不要太绕。`;
  }
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
    summary: `Day ${block.ref.day} · ${slotLabel} · ${block.ref.placeName}`,
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
    "请基于当前方案重新生成，并按以下修改处理：",
    ...lines,
    "同时保持每天路线顺路，不要让安排太赶。",
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

  return `${trimmedDraft}\n\n另外，请按下面这些要求统一重排：\n${trimmedCompiled}`;
}

export function buildQuickModificationRequest(
  type: QuickModificationType,
): string {
  switch (type) {
    case "relax":
      return "请把这版行程整体放轻松一点，每天少安排一点，留出更多休息和自由活动时间，但保留这次旅行最值得去的体验。";
    case "lessWalking":
      return "请把这版行程改得少走路一点，尽量安排顺路、少折返、少跨区域移动的版本。";
    case "lowerBudget":
      return "请把这版行程的预算再压低一点，优先保留性价比高的安排，减少花费偏高但必要性不强的项目。";
    case "addFoodNightMarket":
      return "请在不把行程塞太满的前提下，加一点本地美食、夜市或者适合晚上去的小吃安排。";
    case "noEarlyStart":
      return "请把这版行程改成不用太早出门的节奏，上午安排轻松一点，尽量不要早起赶行程。";
  }
}
