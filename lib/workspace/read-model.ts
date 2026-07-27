import {
  mapDailyItineraryToCabinet,
  type DayCabinetView,
  type ItineraryBlockView,
} from "@/lib/trip/itinerary-view";
import { getItineraryBlockId } from "@/lib/trip/map-point-match";
import type { ItineraryItemType, TripPlan } from "@/lib/trip/types";

export interface WorkspaceReadVisuals {
  heroImage?: string;
  sketch?: string;
  stamp?: string;
}

export interface WorkspaceReadPlace {
  id: string;
  title: string;
  typeLabel: string;
  slotLabel: string;
  timeLabel?: string;
  summary: string;
  visuals: WorkspaceReadVisuals;
  sourceBlock: ItineraryBlockView;
}

export interface WorkspaceReadDayModel {
  dayNumber: number;
  title: string;
  date?: string;
  routeSummary: string;
  routeReason: string;
  tips: string[];
  highlights: string[];
  places: WorkspaceReadPlace[];
  placeCount: number;
  visuals: WorkspaceReadVisuals;
}

export interface WorkspaceReadViewModel {
  title: string;
  destination: string;
  summary: string;
  days: number;
  highlights: string[];
  daysList: WorkspaceReadDayModel[];
  visuals: WorkspaceReadVisuals;
}

const ITEM_TYPE_LABELS: Record<ItineraryItemType, string> = {
  attraction: "景点",
  food: "餐饮",
  hotel: "住宿",
  transport: "交通",
  free_time: "留白",
  shopping: "逛街",
  other: "行程",
};

function getItemTypeLabel(type: ItineraryItemType) {
  return ITEM_TYPE_LABELS[type] ?? "行程";
}

function buildDayHighlights(cabinet: DayCabinetView) {
  const highlightSet = new Set<string>();

  if (cabinet.routeSummary) {
    highlightSet.add(cabinet.routeSummary);
  }

  for (const slot of cabinet.slots) {
    const firstPlaceName = slot.items[0]?.item.placeName;

    if (firstPlaceName) {
      highlightSet.add(firstPlaceName);
    }

    if (highlightSet.size >= 3) {
      break;
    }
  }

  return Array.from(highlightSet);
}

function buildReadPlace(block: ItineraryBlockView, slotLabel: string): WorkspaceReadPlace {
  return {
    id: getItineraryBlockId(block),
    title: block.item.placeName,
    typeLabel: getItemTypeLabel(block.item.type),
    slotLabel,
    timeLabel: block.item.timeLabel,
    summary: block.item.reason || "这一站的细节还没补充。",
    visuals: {},
    sourceBlock: block,
  };
}

function buildReadDayModel(cabinet: DayCabinetView): WorkspaceReadDayModel {
  const places = cabinet.slots.flatMap((slot) =>
    slot.items.map((block) => buildReadPlace(block, slot.label)),
  );

  return {
    dayNumber: cabinet.dayNumber,
    title: cabinet.theme || `第 ${cabinet.dayNumber} 天`,
    date: cabinet.date,
    routeSummary: cabinet.routeSummary,
    routeReason: cabinet.routeReason || cabinet.routeSummary || "先顺着这一天的路线慢慢看。",
    tips: cabinet.dailyTips,
    highlights: buildDayHighlights(cabinet),
    places,
    placeCount: places.length,
    visuals: {},
  };
}

export function buildWorkspaceReadViewModel(
  tripPlan: TripPlan,
): WorkspaceReadViewModel {
  const daysList = tripPlan.dailyItinerary.map((itinerary) =>
    buildReadDayModel(mapDailyItineraryToCabinet(itinerary)),
  );
  const highlights = Array.from(
    new Set(
      daysList
        .flatMap((day) => day.highlights)
        .filter((highlight) => highlight.trim().length > 0),
    ),
  ).slice(0, 4);

  return {
    title: tripPlan.tripTitle,
    destination: tripPlan.destination,
    summary: tripPlan.summary,
    days: tripPlan.days,
    highlights,
    daysList,
    visuals: {},
  };
}
