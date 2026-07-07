import type { MapPoint } from "./enrichment-types";
import type { ItineraryBlockRef, ItineraryBlockView } from "./itinerary-view";
import type { ItineraryItemType } from "./types";

export type ItineraryBlockMapStatus = "confirmed" | "unresolved" | "unmatched";

const NON_MATCHABLE_ITEM_TYPES = new Set<ItineraryItemType>([
  "transport",
  "hotel",
  "free_time",
]);

const GENERIC_NON_POI_NAMES = new Set([
  "早餐",
  "午餐",
  "晚餐",
  "午饭",
  "晚饭",
  "夜宵",
  "下午茶",
  "自由活动",
  "自由安排",
  "酒店休息",
  "回酒店休息",
  "返程",
  "休息",
  "入住",
  "退房",
]);

const GENERIC_NON_POI_PATTERNS = [
  "早餐",
  "午餐",
  "晚餐",
  "午饭",
  "晚饭",
  "夜宵",
  "自由活动",
  "自由安排",
  "酒店休息",
  "回酒店休息",
  "入住酒店",
  "办理入住",
  "退房",
  "返程",
];

function getBlockRef(
  blockOrRef: ItineraryBlockView | ItineraryBlockRef,
): ItineraryBlockRef {
  return "ref" in blockOrRef ? blockOrRef.ref : blockOrRef;
}

export function normalizeMapPointName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[()（）[\]【】]/g, " ")
    .replace(/[，,。.!！?？:：/\\|·•\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGenericNonPoiPlace(
  placeName: string,
  itemType?: ItineraryItemType,
): boolean {
  if (itemType && NON_MATCHABLE_ITEM_TYPES.has(itemType)) {
    return true;
  }

  const trimmedName = placeName.trim();
  if (!trimmedName) {
    return true;
  }

  if (GENERIC_NON_POI_NAMES.has(trimmedName)) {
    return true;
  }

  return GENERIC_NON_POI_PATTERNS.some((pattern) => trimmedName.includes(pattern));
}

export function getItineraryBlockId(
  blockOrRef: ItineraryBlockView | ItineraryBlockRef,
): string {
  const ref = getBlockRef(blockOrRef);
  const normalizedName = normalizeMapPointName(ref.placeName).replace(/\s+/g, "-");

  return `day-${ref.day}-${ref.slot}-${ref.itemIndex}-${normalizedName || "item"}`;
}

export function getMapPointBlockId(point: MapPoint): string {
  return getItineraryBlockId({
    day: point.dayIndex,
    slot: point.slot,
    itemIndex: point.itemIndex,
    placeName: point.name,
    type: point.itemType,
  });
}

function getPointMatchScore(block: ItineraryBlockView, point: MapPoint): number {
  if (point.dayIndex !== block.ref.day) {
    return -1;
  }

  const blockName = block.item.placeName.trim();
  const pointName = point.name.trim();
  const normalizedBlockName = normalizeMapPointName(blockName);
  const normalizedPointName = normalizeMapPointName(pointName);

  if (!normalizedBlockName || !normalizedPointName) {
    return -1;
  }

  let score = -1;

  if (blockName === pointName && block.ref.slot === point.slot) {
    score = 120;
  } else if (blockName === pointName) {
    score = 90;
  } else if (normalizedBlockName === normalizedPointName && block.ref.slot === point.slot) {
    score = 80;
  } else if (normalizedBlockName === normalizedPointName) {
    score = 60;
  }

  if (score < 0) {
    return -1;
  }

  if (block.ref.slot === point.slot) {
    score += 12;
  }

  if (block.ref.itemIndex === point.itemIndex) {
    score += 8;
  } else if (Math.abs(block.ref.itemIndex - point.itemIndex) === 1) {
    score += 3;
  }

  if (block.ref.type === point.itemType) {
    score += 2;
  }

  return score;
}

export function findMatchingMapPoint(
  block: ItineraryBlockView,
  mapPoints: MapPoint[],
): MapPoint | null {
  if (isGenericNonPoiPlace(block.item.placeName, block.item.type)) {
    return null;
  }

  const sortedMatches = mapPoints
    .map((point) => ({
      point,
      score: getPointMatchScore(block, point),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score);

  return sortedMatches[0]?.point ?? null;
}

export function getItineraryBlockMapStatus(
  block: ItineraryBlockView,
  mapPoints: MapPoint[],
): ItineraryBlockMapStatus {
  const match = findMatchingMapPoint(block, mapPoints);

  if (!match) {
    return "unmatched";
  }

  return match.resolved ? "confirmed" : "unresolved";
}
