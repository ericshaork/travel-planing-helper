import type { WeatherAlert, WeatherDay } from "../weather/types";

export interface TripRequestDraft {
  departureCity?: string;
  destinationCity?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  budget?: number;
  currency?: string;
  interests?: string[];
  travelStyles?: string[];
  mustVisitPlaces?: string[];
  avoidPlaces?: string[];
  accommodationPreference?: string;
  localTransportPreference?: string;
  schedulePreference?: string;
  specialRequirements?: string;
}

export type TripSourceType =
  | "manual"
  | "ai_generate"
  | "ai_generated"
  | "blank_manual"
  | "explore_archive"
  | "explore_inspiration"
  | "user_created";

export interface TripSourceMeta {
  sourceType: TripSourceType;
  sourceExploreId?: string;
  sourceExploreSlug?: string;
}

export interface TripRequest {
  departureCity: string;
  destinationCity: string;
  startDate?: string;
  endDate?: string;
  days: number;
  budget: number;
  currency: string;
  interests: string[];
  travelStyles: string[];
  mustVisitPlaces: string[];
  avoidPlaces: string[];
  accommodationPreference?: string;
  localTransportPreference?: string;
  schedulePreference?: string;
  specialRequirements?: string;
}

export interface WeatherSummary {
  available: boolean;
  overview: string;
  dailyForecast: WeatherDay[];
  alerts: WeatherAlert[];
  reminders: string[];
  dataNote: string;
}

export interface BudgetSummary {
  totalEstimate: string;
  transport: string;
  hotel: string;
  food: string;
  tickets: string;
  localTransport: string;
  flexibleSpending: string;
  note: string;
}

export interface HotelAreaAdvice {
  area: string;
  reason: string;
  suitableFor: string;
  transportationConvenience: string;
  possibleDownside?: string;
  suggestedPlatforms: string[];
}

export type TransportMode =
  | "flight"
  | "train"
  | "high_speed_rail"
  | "bus"
  | "ship"
  | "other";

export interface TransportOption {
  mode: TransportMode;
  pros: string[];
  cons: string[];
  recommendation: string;
}

export interface TransportAdvice {
  summary: string;
  options: TransportOption[];
  suggestedPlatforms: string[];
  note: string;
}

export type ItineraryItemType =
  | "attraction"
  | "food"
  | "transport"
  | "hotel"
  | "free_time"
  | "shopping"
  | "other";

export type TimeSlotKey = "morning" | "afternoon" | "evening";

export interface DailyTimeSlot {
  id: string;
  baseSlot: TimeSlotKey;
  label: string;
  startTime?: string;
  endTime?: string;
}

export interface ItineraryItem {
  timeLabel?: string;
  placeName: string;
  type: ItineraryItemType;
  reason: string;
  suggestedDuration?: string;
  guide: string[];
  transportFromPrevious?: string;
  weatherImpact?: string;
  backupPlan?: string;
  matchedInterests?: string[];
  editorId?: string;
  editorSlotId?: string;
}

export interface DailyItinerary {
  day: number;
  date?: string;
  theme: string;
  routeOrder: string[];
  routeReason: string;
  morning: ItineraryItem[];
  afternoon: ItineraryItem[];
  evening: ItineraryItem[];
  dailyTips: string[];
  timeSlots?: DailyTimeSlot[];
}

export interface TripPlan {
  tripTitle: string;
  summary: string;
  destination: string;
  days: number;
  travelStyleSummary: string;
  weatherSummary: WeatherSummary;
  budgetSummary: BudgetSummary;
  hotelAreaAdvice: HotelAreaAdvice[];
  transportAdvice: TransportAdvice;
  dailyItinerary: DailyItinerary[];
  generalTips: string[];
  warnings: string[];
}

export interface TripPlanDraft extends TripSourceMeta {
  tripTitle: string;
  tripRequestDraft: TripRequestDraft;
  tripPlanSeed: TripPlan;
}

export interface ParseTripRequest {
  text: string;
}

export interface ParseTripResponse {
  parsed: TripRequestDraft;
  missingFields: string[];
  followUpQuestions: string[];
}

export interface GenerateTripRequest {
  tripRequest: TripRequest;
  modificationRequest?: string;
  previousPlan?: TripPlan;
}

export interface GenerateTripResponse {
  tripPlan: TripPlan;
  appliedChanges?: string[];
  warnings?: string[];
}
