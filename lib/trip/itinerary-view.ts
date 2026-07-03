import type {
  DailyItinerary,
  ItineraryItem,
  ItineraryItemType,
  TripPlan,
} from "./types";

export type TimeSlotKey = "morning" | "afternoon" | "evening";

export interface ItineraryBlockRef {
  day: number;
  slot: TimeSlotKey;
  itemIndex: number;
  placeName: string;
  type: ItineraryItemType;
}

export interface ItineraryBlockView {
  ref: ItineraryBlockRef;
  item: ItineraryItem;
}

export interface TimeSlotView {
  key: TimeSlotKey;
  label: "上午" | "下午" | "晚上";
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

const SLOT_LABELS: Record<TimeSlotKey, TimeSlotView["label"]> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

const SLOT_KEYS: TimeSlotKey[] = ["morning", "afternoon", "evening"];

export function getTimeSlotLabel(key: TimeSlotKey): TimeSlotView["label"] {
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

export function getTimeSlotItems(
  itinerary: DailyItinerary,
  slot: TimeSlotKey,
): ItineraryBlockView[] {
  return itinerary[slot].map((item, itemIndex) => ({
    ref: {
      day: itinerary.day,
      slot,
      itemIndex,
      placeName: item.placeName,
      type: item.type,
    },
    item,
  }));
}

export function mapDailyItineraryToCabinet(
  itinerary: DailyItinerary,
): DayCabinetView {
  const slots = SLOT_KEYS.map((key) => {
    const items = getTimeSlotItems(itinerary, key);

    return {
      key,
      label: getTimeSlotLabel(key),
      items,
      isEmpty: items.length === 0,
    };
  });

  return {
    dayNumber: itinerary.day,
    date: itinerary.date,
    theme: itinerary.theme,
    routeOrder: [...itinerary.routeOrder],
    routeSummary: itinerary.routeOrder.join(" → "),
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
