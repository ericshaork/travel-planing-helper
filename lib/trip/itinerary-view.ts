import type {
  DailyItinerary,
  DailyTimeSlot,
  ItineraryItem,
  ItineraryItemType,
  TimeSlotKey,
  TripPlan,
} from "./types";

export type { TimeSlotKey } from "./types";

export interface TimeSlotDefinition {
  id: string;
  key: TimeSlotKey;
  label: string;
  startTime?: string;
  endTime?: string;
}

export interface ItineraryBlockRef {
  day: number;
  slot: TimeSlotKey;
  slotId?: string;
  itemIndex: number;
  placeName: string;
  type: ItineraryItemType;
  editorId?: string;
}

export interface ItineraryBlockView {
  ref: ItineraryBlockRef;
  item: ItineraryItem;
}

export interface TimeSlotView extends TimeSlotDefinition {
  items: ItineraryBlockView[];
  isEmpty: boolean;
}

export interface TimeSlotPreview {
  label: TimeSlotView["label"];
  primaryName: string;
  extraCount: number;
}

export interface DayCabinetView {
  dayNumber: number;
  date?: string;
  theme: string;
  routeOrder: string[];
  routeSummary: string;
  routeReason: string;
  dailyTips: string[];
  itemCount: number;
  slots: TimeSlotView[];
  itinerary: DailyItinerary;
}

export const DEFAULT_TIME_SLOT_DEFINITIONS: TimeSlotDefinition[] = [
  {
    id: "morning",
    key: "morning",
    label: "上午",
    startTime: "08:00",
    endTime: "12:00",
  },
  {
    id: "afternoon",
    key: "afternoon",
    label: "下午",
    startTime: "12:00",
    endTime: "18:00",
  },
  {
    id: "evening",
    key: "evening",
    label: "晚上",
    startTime: "18:00",
    endTime: "22:00",
  },
];

const SLOT_LABELS: Record<TimeSlotKey, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

function normalizeCustomTimeSlots(
  timeSlots?: DailyTimeSlot[],
): TimeSlotDefinition[] {
  if (!timeSlots || timeSlots.length === 0) {
    return getDefaultTimeSlotDefinitions();
  }

  return timeSlots.map((slot) => ({
    id: slot.id,
    key: slot.baseSlot,
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));
}

function getResolvedSlotId(
  item: ItineraryItem,
  baseSlot: TimeSlotKey,
  slotDefinitions: TimeSlotDefinition[],
): string {
  if (
    item.editorSlotId &&
    slotDefinitions.some((slot) => slot.id === item.editorSlotId)
  ) {
    return item.editorSlotId;
  }

  return (
    slotDefinitions.find((slot) => slot.key === baseSlot)?.id ??
    DEFAULT_TIME_SLOT_DEFINITIONS.find((slot) => slot.key === baseSlot)?.id ??
    baseSlot
  );
}

export function getTimeSlotLabel(key: TimeSlotKey): string {
  return SLOT_LABELS[key];
}

export function getTimeSlotPreview(slot: TimeSlotView): TimeSlotPreview {
  const primaryItem = slot.items[0]?.item;

  return {
    label: slot.label,
    primaryName: primaryItem?.placeName ?? "自由安排",
    extraCount: Math.max(slot.items.length - 1, 0),
  };
}

export function getDefaultTimeSlotDefinitions() {
  return DEFAULT_TIME_SLOT_DEFINITIONS.map((slot) => ({ ...slot }));
}

export function getTimeSlotDefinitions(
  itinerary: DailyItinerary,
): TimeSlotDefinition[] {
  return normalizeCustomTimeSlots(itinerary.timeSlots);
}

export function getTimeSlotItems(
  itinerary: DailyItinerary,
  slotDefinition: TimeSlotDefinition,
  slotDefinitions = getTimeSlotDefinitions(itinerary),
): ItineraryBlockView[] {
  return itinerary[slotDefinition.key]
    .map((item, itemIndex) => ({
      item,
      itemIndex,
      slotId: getResolvedSlotId(item, slotDefinition.key, slotDefinitions),
    }))
    .filter((entry) => entry.slotId === slotDefinition.id)
    .map(({ item, itemIndex }) => ({
      ref: {
        day: itinerary.day,
        slot: slotDefinition.key,
        slotId: slotDefinition.id,
        itemIndex,
        placeName: item.placeName,
        type: item.type,
        editorId: item.editorId,
      },
      item,
    }));
}

export function mapDailyItineraryToCabinet(
  itinerary: DailyItinerary,
): DayCabinetView {
  const slotDefinitions = getTimeSlotDefinitions(itinerary);
  const slots = slotDefinitions.map((definition) => {
    const items = getTimeSlotItems(itinerary, definition, slotDefinitions);

    return {
      ...definition,
      items,
      isEmpty: items.length === 0,
    };
  });

  return {
    dayNumber: itinerary.day,
    date: itinerary.date,
    theme: itinerary.theme,
    routeOrder: [...itinerary.routeOrder],
    routeSummary: itinerary.routeOrder.join(" -> "),
    routeReason: itinerary.routeReason,
    dailyTips: [...itinerary.dailyTips],
    itemCount: slots.reduce((count, slot) => count + slot.items.length, 0),
    slots,
    itinerary,
  };
}

export function mapTripPlanToCabinets(tripPlan: TripPlan): DayCabinetView[] {
  return tripPlan.dailyItinerary.map(mapDailyItineraryToCabinet);
}
