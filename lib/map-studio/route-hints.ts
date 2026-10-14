import type {
  CandidatePlace,
  MapCoordinate,
  MapPlace,
  MapProject,
} from "./types";
import { MAP_PLACE_CATEGORY_TO_ITINERARY_TYPE } from "./types";
import type { ItineraryItem, TripPlan } from "../trip/types";

export type RouteHintType =
  | "day_capacity"
  | "same_region"
  | "distance_near"
  | "distance_far"
  | "category_density";

export type RouteHintSeverity = "info" | "warning";

export interface RouteHint {
  id: string;
  type: RouteHintType;
  severity: RouteHintSeverity;
  title: string;
  message: string;
}

export interface BuildRouteHintsInput {
  tripPlan: TripPlan;
  mapProject: MapProject;
  candidate?: CandidatePlace;
  dayNumber?: number;
}

const FAR_DISTANCE_KM = 12;
const NEAR_DISTANCE_KM = 3;
const BUSY_DAY_THRESHOLD = 5;
const CATEGORY_DENSE_THRESHOLD = 2;

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getDayItems(tripPlan: TripPlan, dayNumber?: number): ItineraryItem[] {
  const day =
    tripPlan.dailyItinerary.find((item) => item.day === dayNumber) ??
    tripPlan.dailyItinerary[0];

  if (!day) {
    return [];
  }

  return [...day.morning, ...day.afternoon, ...day.evening];
}

function findMapPlaceForItem(
  mapProject: MapProject,
  item: ItineraryItem,
): MapPlace | undefined {
  const itemName = normalizeName(item.placeName);

  return mapProject.places.find((place) => {
    return (
      normalizeName(place.displayName) === itemName ||
      normalizeName(place.name) === itemName
    );
  });
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function estimateMapDistanceKm(
  from: MapCoordinate,
  to: MapCoordinate,
) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const startLat = toRadians(from.lat);
  const endLat = toRadians(to.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function formatDistanceKm(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} 米`;
  }

  return `${distanceKm.toFixed(1)} 公里`;
}

function getNearestDistanceKm(candidate: MapPlace, plannedPlaces: MapPlace[]) {
  if (plannedPlaces.length === 0) {
    return null;
  }

  return Math.min(
    ...plannedPlaces.map((place) =>
      estimateMapDistanceKm(
        { lat: candidate.lat, lng: candidate.lng },
        { lat: place.lat, lng: place.lng },
      ),
    ),
  );
}

export function buildRouteHints({
  tripPlan,
  mapProject,
  candidate,
  dayNumber,
}: BuildRouteHintsInput): RouteHint[] {
  if (!candidate) {
    return [
      {
        id: "select-candidate",
        type: "same_region",
        severity: "info",
        title: "先选一个候选地点",
        message: "选中候选地点后，这里会给出粗略的路线合理性提示。",
      },
    ];
  }

  const dayItems = getDayItems(tripPlan, dayNumber);
  const plannedPlaces = dayItems
    .map((item) => findMapPlaceForItem(mapProject, item))
    .filter((place): place is MapPlace => Boolean(place));
  const hints: RouteHint[] = [];

  if (dayItems.length >= BUSY_DAY_THRESHOLD) {
    hints.push({
      id: "day-capacity",
      type: "day_capacity",
      severity: "warning",
      title: "当天安排偏满",
      message: "当前 Day 的地点偏多，建议少塞 1-2 个，避免自由行变成赶场。",
    });
  }

  const sameRegionCount = plannedPlaces.filter(
    (place) => place.regionId === candidate.regionId,
  ).length;

  if (sameRegionCount > 0) {
    hints.push({
      id: "same-region",
      type: "same_region",
      severity: "info",
      title: "区域相近",
      message: "这几个地点在同一区域，适合同一天安排，路线会比较顺。",
    });
  }

  const nearestDistanceKm = getNearestDistanceKm(candidate.place, plannedPlaces);

  if (nearestDistanceKm !== null && nearestDistanceKm <= NEAR_DISTANCE_KM) {
    hints.push({
      id: "distance-near",
      type: "distance_near",
      severity: "info",
      title: "距离较近",
      message: `候选地点和当天最近地点约 ${formatDistanceKm(nearestDistanceKm)}，适合放在一起看。`,
    });
  }

  if (nearestDistanceKm !== null && nearestDistanceKm >= FAR_DISTANCE_KM) {
    hints.push({
      id: "distance-far",
      type: "distance_far",
      severity: "warning",
      title: "距离偏远",
      message: `这个地点离当天主路线较远，粗略相距约 ${formatDistanceKm(nearestDistanceKm)}，建议单独安排半天。`,
    });
  }

  const candidateItemType =
    MAP_PLACE_CATEGORY_TO_ITINERARY_TYPE[candidate.place.category];
  const sameTypeCount = dayItems.filter(
    (item) => item.type === candidateItemType,
  ).length;

  if (sameTypeCount >= CATEGORY_DENSE_THRESHOLD) {
    hints.push({
      id: "category-density",
      type: "category_density",
      severity: "warning",
      title: "主题有点密",
      message: "这个类型当天已经不少，建议留一点空档，别把同一种体验排太满。",
    });
  }

  if (hints.length === 0) {
    hints.push({
      id: "route-neutral",
      type: "same_region",
      severity: "info",
      title: "可以尝试加入",
      message: "目前没有明显冲突；这只是粗略提示，最终还是按体力和天气再取舍。",
    });
  }

  return hints;
}
