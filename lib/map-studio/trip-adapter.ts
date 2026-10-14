import type { MapPoint } from "../trip/enrichment-types";
import type {
  DailyItinerary,
  ItineraryItem,
  ItineraryItemType,
  TimeSlotKey,
  TripPlan,
} from "../trip/types";
import {
  type ApplyCandidateInput,
  type ApplyCandidateResult,
  type BuildMapProjectInput,
  type CandidatePlace,
  MAP_PLACE_CATEGORY_TO_ITINERARY_TYPE,
  type MapCoordinate,
  type MapPlaceCategory,
  type MapPlace,
  type MapPlaceToItineraryItemInput,
  type MapProject,
  type MapRegion,
  type RevertCandidateInput,
  type RevertCandidateResult,
  type UnresolvedMapPlace,
} from "./types";
import {
  buildCuratedMapProject,
  resolveCuratedDestination,
} from "./curated-destinations";
import { createMockMapProject } from "./mock-project";

const SLOT_LABELS: Record<TimeSlotKey, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

const SLOT_KEYS: TimeSlotKey[] = ["morning", "afternoon", "evening"];

const ITINERARY_TYPE_TO_MAP_CATEGORY: Record<ItineraryItemType, MapPlaceCategory> = {
  attraction: "attraction",
  food: "food",
  transport: "transport",
  hotel: "experience",
  free_time: "experience",
  shopping: "shopping",
  other: "experience",
};

export interface ExtractedPlanPlace {
  day: number;
  slot: TimeSlotKey;
  itemIndex: number;
  item: ItineraryItem;
}

export function extractPlanPlacesFromTripPlan(tripPlan: TripPlan): ExtractedPlanPlace[] {
  return tripPlan.dailyItinerary.flatMap((day) =>
    SLOT_KEYS.flatMap((slot) =>
      day[slot]
        .map((item, itemIndex) => ({
          day: day.day,
          slot,
          itemIndex,
          item,
        }))
        .filter((place) => place.item.placeName.trim().length > 0),
    ),
  );
}

function normalizePlaceName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function slugify(value: string) {
  const normalized = normalizePlaceName(value);

  return (
    normalized
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "place"
  );
}

function isValidCoordinate(value: MapPoint["coordinates"]): value is MapCoordinate {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  );
}

function findMapPoint(
  mapPoints: MapPoint[],
  place: ExtractedPlanPlace,
): MapPoint | undefined {
  const normalizedPlaceName = normalizePlaceName(place.item.placeName);

  return mapPoints.find(
    (point) =>
      point.dayIndex === place.day &&
      point.slot === place.slot &&
      point.itemIndex === place.itemIndex,
  ) ?? mapPoints.find(
    (point) =>
      point.dayIndex === place.day &&
      point.slot === place.slot &&
      normalizePlaceName(point.name) === normalizedPlaceName,
  ) ?? mapPoints.find(
    (point) => normalizePlaceName(point.name) === normalizedPlaceName,
  );
}

function averageCenter(points: MapCoordinate[]): MapCoordinate | null {
  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat,
      lng: accumulator.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

function createPlanRegion(
  city: string,
  center: MapCoordinate,
  placeIds: string[],
  routeIds: string[],
): MapRegion {
  const latOffset = 0.035;
  const lngOffset = 0.045;

  return {
    id: "current-trip-plan-region",
    name: "当前行程",
    displayName: "当前行程",
    city,
    regionType: "custom",
    boundary: {
      type: "polygon",
      coordinates: [[
        { lat: center.lat + latOffset, lng: center.lng - lngOffset },
        { lat: center.lat + latOffset, lng: center.lng + lngOffset },
        { lat: center.lat - latOffset, lng: center.lng + lngOffset },
        { lat: center.lat - latOffset, lng: center.lng - lngOffset },
      ]],
      source: "custom",
    },
    fallbackCenter: center,
    fillColor: "rgba(47,62,52,0.36)",
    borderColor: "rgba(244,207,111,0.5)",
    hoverColor: "rgba(244,207,111,0.18)",
    selectedColor: "rgba(244,207,111,0.28)",
    labelPosition: center,
    summary: "当前 TripPlan 已安排地点。用于承载真实行程 marker，不替代推荐数据。",
    tags: ["已在行程中"],
    bestFor: ["查看已有安排"],
    representativePlaceIds: placeIds,
    routeIds,
    state: {
      isVisible: false,
      isHovered: false,
      isSelected: false,
      isHighlighted: false,
    },
    dataStatus: "placeholder",
  };
}

function createUnresolvedPlanPlace(
  place: ExtractedPlanPlace,
  mapPoint?: MapPoint,
): UnresolvedMapPlace {
  return {
    id: `unresolved-day-${place.day}-${place.slot}-${place.itemIndex}-${slugify(
      place.item.placeName,
    )}`,
    placeName: place.item.placeName.trim(),
    day: place.day,
    slot: place.slot,
    itemIndex: place.itemIndex,
    type: place.item.type,
    reason: place.item.reason,
    ...(place.item.suggestedDuration
      ? { suggestedDuration: place.item.suggestedDuration }
      : {}),
    ...(place.item.timeLabel ? { timeLabel: place.item.timeLabel } : {}),
    ...(place.item.editorId ? { editorId: place.item.editorId } : {}),
    ...(place.item.editorSlotId ? { editorSlotId: place.item.editorSlotId } : {}),
    status: "missing_coordinates",
    warning: mapPoint?.warning ?? "缺少坐标，暂时不能在地图上落点。",
  };
}

function createPlanMapPlace(input: {
  city: string;
  regionId: string;
  place: ExtractedPlanPlace;
  mapPoint: MapPoint;
  coordinates: MapCoordinate;
  priority: number;
}): MapPlace {
  const { city, regionId, place, mapPoint, coordinates, priority } = input;
  const displayName = place.item.placeName.trim();
  const category = ITINERARY_TYPE_TO_MAP_CATEGORY[place.item.type];

  return {
    id: `plan-day-${place.day}-${place.slot}-${place.itemIndex}-${slugify(displayName)}`,
    name: displayName,
    displayName,
    city,
    regionId,
    lat: coordinates.lat,
    lng: coordinates.lng,
    category,
    priority,
    tags: ["已在行程中", SLOT_LABELS[place.slot], place.item.type],
    shortDescription: place.item.reason || "来自当前 TripPlan 的真实行程地点。",
    longDescription:
      place.item.reason || "来自当前 TripPlan 的真实行程地点，坐标来自现有地点解析链路。",
    suggestedDuration: place.item.suggestedDuration ?? "待确认",
    bestFor: [SLOT_LABELS[place.slot]],
    openingHours: "建议出行前在官方平台再次确认。",
    ticketInfo: "暂无实时票价，建议出行前核实。",
    crowdLevel: "暂无实时拥挤度。",
    imagePlaceholder: "trip-plan-place",
    source: {
      label: "当前 TripPlan",
    },
    sourceType: "plan",
    sourceStatus: mapPoint.provider ? "api" : "placeholder",
    dataStatus: mapPoint.provider ? "api" : "placeholder",
    isCandidate: false,
    assignedDayId: String(place.day),
    relationshipToPlan: "已在行程中",
    planMeta: {
      day: place.day,
      slot: place.slot,
      itemIndex: place.itemIndex,
      placeName: displayName,
      type: place.item.type,
      reason: place.item.reason,
      ...(place.item.suggestedDuration
        ? { suggestedDuration: place.item.suggestedDuration }
        : {}),
      ...(place.item.timeLabel ? { timeLabel: place.item.timeLabel } : {}),
      ...(place.item.editorId ? { editorId: place.item.editorId } : {}),
      ...(place.item.editorSlotId ? { editorSlotId: place.item.editorSlotId } : {}),
      ...(mapPoint.address ? { address: mapPoint.address } : {}),
      ...(mapPoint.provider ? { provider: mapPoint.provider } : {}),
      resolved: true,
      ...(mapPoint.warning ? { warning: mapPoint.warning } : {}),
    },
    ui: {
      markerIcon: "planned",
      markerColor: "#2F3E34",
      isVisible: true,
      isHovered: false,
      isSelected: false,
      isHighlighted: false,
    },
  };
}

function buildPlanRoutes(input: {
  city: string;
  planPlaces: MapPlace[];
  tripPlan: TripPlan;
}) {
  const { city, planPlaces, tripPlan } = input;

  return tripPlan.dailyItinerary.map((day) => {
    const dayPlaces = planPlaces.filter(
      (place) => place.planMeta?.day === day.day,
    );

    return {
      id: `plan-day-${day.day}-route`,
      name: `Day ${day.day} 已有行程顺序`,
      routeType: "day_route" as const,
      dayId: String(day.day),
      placeIds: dayPlaces.map((place) => place.id),
      path: {
        type: dayPlaces.length > 1 ? ("polyline" as const) : ("none" as const),
        coordinates: dayPlaces.map((place) => ({
          lat: place.lat,
          lng: place.lng,
        })),
        source: dayPlaces.length > 1 ? ("placeholder" as const) : ("none" as const),
      },
      estimatedDuration: "暂未计算真实路线时间",
      estimatedDistance: "暂未计算真实路线距离",
      transportMode: "mixed" as const,
      warnings: [],
      suggestions: [
        `${city} 当前只按 TripPlan 顺序连线，真实路线和通勤时间需出行前确认。`,
      ],
      animationState: "idle" as const,
      dataStatus: "placeholder" as const,
    };
  });
}

export function buildMapProjectFromTripPlan(input: BuildMapProjectInput): MapProject {
  const extractedPlaces = extractPlanPlacesFromTripPlan(input.tripPlan);

  if (extractedPlaces.length === 0) {
    return createMockMapProject(input);
  }

  const city = input.tripPlan.destination || input.tripRequest?.destinationCity || "目的地";
  const curatedDestination = resolveCuratedDestination({
    country: "中国",
    city,
  });
  const baseProject = curatedDestination
    ? buildCuratedMapProject(curatedDestination, input)
    : createMockMapProject(input);
  const mapPoints = input.mapPoints ?? [];
  const resolvedPlaces: MapPlace[] = [];
  const unresolvedPlaces: UnresolvedMapPlace[] = [];

  for (const [index, planPlace] of extractedPlaces.entries()) {
    const mapPoint = findMapPoint(mapPoints, planPlace);
    const coordinates = isValidCoordinate(mapPoint?.coordinates)
      ? mapPoint.coordinates
      : undefined;

    if (!mapPoint || !mapPoint.resolved || !coordinates) {
      unresolvedPlaces.push(createUnresolvedPlanPlace(planPlace, mapPoint));
      continue;
    }

    resolvedPlaces.push(
      createPlanMapPlace({
        city,
        regionId: "current-trip-plan-region",
        place: planPlace,
        mapPoint,
        coordinates,
        priority: index + 1,
      }),
    );
  }

  const resolvedCenter = averageCenter(
    resolvedPlaces.map((place) => ({ lat: place.lat, lng: place.lng })),
  );
  const center = resolvedCenter ?? baseProject.mapMode.center;
  const routes = buildPlanRoutes({
    city,
    planPlaces: resolvedPlaces,
    tripPlan: input.tripPlan,
  });
  const planRegion = createPlanRegion(
    city,
    center,
    resolvedPlaces.map((place) => place.id),
    routes.map((route) => route.id),
  );
  const recommendationPlaces = curatedDestination ? baseProject.places : [];
  const layers = baseProject.layers.map((layer) =>
    layer.type === "routes"
      ? {
          ...layer,
          isVisible: routes.some((route) => route.placeIds.length > 1),
        }
      : layer,
  );

  return {
    ...baseProject,
    title: `${city}地图探索`,
    city,
    mapMode: {
      ...baseProject.mapMode,
      currentLayer: "layer-places",
      zoomLevel: resolvedPlaces.length > 0 ? 13 : baseProject.mapMode.zoomLevel,
      center,
      activeTool: "place",
    },
    regions: [planRegion, ...baseProject.regions],
    places: [...resolvedPlaces, ...recommendationPlaces],
    routes,
    layers,
    selectedRegionId: resolvedPlaces.length > 0 ? planRegion.id : undefined,
    selectedPlaceId: resolvedPlaces[0]?.id,
    candidatePlaceIds: [],
    candidatePlaces: [],
    unresolvedPlaces,
    activeDayId: input.tripPlan.dailyItinerary[0]
      ? String(input.tripPlan.dailyItinerary[0].day)
      : undefined,
    updatedAt: input.now ?? baseProject.updatedAt,
  };
}

export function mapPlaceToItineraryItem({
  place,
  slot,
}: MapPlaceToItineraryItemInput): ItineraryItem {
  const type = MAP_PLACE_CATEGORY_TO_ITINERARY_TYPE[place.category];
  const slotLabel = slot ? SLOT_LABELS[slot] : undefined;

  return {
    ...(slotLabel ? { timeLabel: slotLabel } : {}),
    placeName: place.displayName || place.name,
    type,
    reason:
      place.relationshipToPlan ||
      `${place.displayName || place.name} 来自地图探索候选点，适合确认后加入行程。`,
    suggestedDuration: place.suggestedDuration,
    guide: [
      place.shortDescription,
      "开放时间、票价和拥挤度需出行前在官方平台再次确认。",
    ].filter(Boolean),
    matchedInterests: [...place.tags, ...place.bestFor].slice(0, 5),
    editorId: `map-${place.id}`,
    editorSlotId: slot,
  };
}

function updateDayRouteMeta(day: DailyItinerary): DailyItinerary {
  const routeOrder = [
    ...day.morning,
    ...day.afternoon,
    ...day.evening,
  ].map((item) => item.placeName);

  return {
    ...day,
    routeOrder,
    routeReason:
      routeOrder.length > 0
        ? "已根据当前行程地点更新路线顺序，真实距离与开放信息需出行前确认。"
        : day.routeReason,
  };
}

export function createCandidateFromPlace(
  place: MapPlace,
  now = new Date().toISOString(),
): CandidatePlace {
  return {
    id: `candidate-${place.id}`,
    placeId: place.id,
    place: {
      ...place,
      isCandidate: true,
      sourceType: "candidate",
    },
    regionId: place.regionId,
    suggestedDuration: place.suggestedDuration,
    status: "candidate",
    conflictHints: [],
    ...(place.dataHubPlaceId ? { dataHubPlaceId: place.dataHubPlaceId } : {}),
    ...(place.sourceProvider ? { sourceProvider: place.sourceProvider } : {}),
    ...(place.sourceExternalId ? { sourceExternalId: place.sourceExternalId } : {}),
    ...(place.missingFields ? { missingFields: place.missingFields } : {}),
    ...(place.lastVerifiedAt ? { lastVerifiedAt: place.lastVerifiedAt } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

export function applyCandidateToTripPlan({
  tripPlan,
  candidate,
  dayNumber,
  slot,
  now = new Date().toISOString(),
}: ApplyCandidateInput): ApplyCandidateResult {
  const item = mapPlaceToItineraryItem({
    place: candidate.place,
    slot,
  });
  let didApply = false;

  const nextTripPlan: TripPlan = {
    ...tripPlan,
    dailyItinerary: tripPlan.dailyItinerary.map((day) => {
      if (day.day !== dayNumber) {
        return day;
      }

      didApply = true;
      return updateDayRouteMeta({
        ...day,
        [slot]: [...day[slot], item],
      });
    }),
  };

  if (!didApply) {
    throw new Error(`Day ${dayNumber} does not exist in TripPlan.`);
  }

  return {
    tripPlan: nextTripPlan,
    candidate: {
      ...candidate,
      targetDayId: String(dayNumber),
      targetSlot: slot,
      status: "assigned",
      updatedAt: now,
      place: {
        ...candidate.place,
        isCandidate: true,
        assignedDayId: String(dayNumber),
      },
    },
    item,
  };
}

function removeLastMatchingMapItem(
  items: ItineraryItem[],
  candidate: CandidatePlace,
) {
  let matchIndex = -1;

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];

    if (
      item.editorId === `map-${candidate.placeId}` ||
      item.placeName === candidate.place.displayName ||
      item.placeName === candidate.place.name
    ) {
      matchIndex = index;
      break;
    }
  }

  if (matchIndex < 0) {
    return {
      removed: false,
      items,
    };
  }

  return {
    removed: true,
    items: items.filter((_, index) => index !== matchIndex),
  };
}

export function revertCandidateFromTripPlan({
  tripPlan,
  candidate,
  dayNumber,
  slot,
}: RevertCandidateInput): RevertCandidateResult {
  let removed = false;

  const nextTripPlan: TripPlan = {
    ...tripPlan,
    dailyItinerary: tripPlan.dailyItinerary.map((day) => {
      if (day.day !== dayNumber) {
        return day;
      }

      const result = removeLastMatchingMapItem(day[slot], candidate);
      removed = result.removed;

      if (!result.removed) {
        return day;
      }

      return updateDayRouteMeta({
        ...day,
        [slot]: result.items,
      });
    }),
  };

  return {
    tripPlan: nextTripPlan,
    candidate: {
      ...candidate,
      targetDayId: undefined,
      targetSlot: undefined,
      status: "candidate",
      updatedAt: new Date().toISOString(),
      place: {
        ...candidate.place,
        assignedDayId: undefined,
        isCandidate: true,
      },
    },
    removed,
  };
}
