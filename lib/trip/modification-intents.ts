import { getTimeSlotLabel, type ItineraryBlockRef } from "./itinerary-view";
import type { ItineraryItemType } from "./types";

export type BlockActionType = "remove" | "replace" | "lock" | "addSimilar";

export type QuickModificationType =
  | "relax"
  | "lessWalking"
  | "lowerBudget"
  | "addFoodNightMarket"
  | "noEarlyStart";

interface BlockLike {
  ref: Pick<ItineraryBlockRef, "day" | "slot" | "placeName"> & {
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

function getItemLabel(type?: ItineraryItemType): string {
  return ITEM_TYPE_LABELS[type ?? "other"] ?? "行程安排";
}

function getBlockContext(block: BlockLike): string {
  const slotLabel = getTimeSlotLabel(block.ref.slot);

  return `第 ${block.ref.day} 天${slotLabel}的「${block.ref.placeName}」`;
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
