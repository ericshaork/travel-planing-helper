export const tripTypes = ["family", "couple", "student", "solo"] as const;
export const budgetLevels = ["low", "medium", "high"] as const;
export const paceLevels = ["slow", "balanced", "dense"] as const;
export const preferenceTags = [
  "food",
  "history",
  "nature",
  "citywalk",
  "photo",
  "museum",
  "shopping",
  "nightlife",
  "family_friendly",
  "local_culture",
] as const;

export type TripType = (typeof tripTypes)[number];
export type BudgetLevel = (typeof budgetLevels)[number];
export type PaceLevel = (typeof paceLevels)[number];
export type PreferenceTag = (typeof preferenceTags)[number];

export interface GenerateRequest {
  city: string;
  days: number;
  trip_type: TripType;
  budget: BudgetLevel;
  theme?: string;
  preferences: PreferenceTag[];
  pace: PaceLevel;
}

export interface CityContextPoi {
  id: string;
  name: string;
  district: string;
  type: string;
  description: string;
  best_for: TripType[];
  recommended_duration_minutes: number;
}

export interface CityContextFoodArea {
  name: string;
  district: string;
  specialties: string[];
  best_for: TripType[];
  note: string;
}

export interface CityContext {
  city_code: string;
  city_name: string;
  region_name: string;
  summary: string;
  transport_notes: string[];
  budget_notes: Record<BudgetLevel, string>;
  trip_type_notes: Partial<Record<TripType, string>>;
  suggested_tags: string[];
  pois: CityContextPoi[];
  food_areas: CityContextFoodArea[];
}

export interface PlanActivity {
  time_block: "morning" | "afternoon" | "evening";
  description: string;
  poi_refs: string[];
  food_refs: string[];
}

export interface DailyItineraryItem {
  day: number;
  title: string;
  summary: string;
  activities: PlanActivity[];
}

export interface PlanPoi {
  id: string;
  name: string;
  district: string;
  type: string;
  reason: string;
  recommended_duration_minutes: number;
}

export interface PlanFood {
  id: string;
  name: string;
  district: string;
  category: string;
  reason: string;
}

export interface ExplorePlan {
  id: string;
  slug: string;
  title: string;
  summary: string;
  city: {
    code: string;
    name: string;
    region_name: string;
  };
  trip_type: TripType;
  days: number;
  budget: {
    level: BudgetLevel;
    note: string;
  };
  pace: PaceLevel;
  tags: string[];
  image_prompt: string;
  daily_itinerary: DailyItineraryItem[];
  pois: PlanPoi[];
  food: PlanFood[];
}

export interface PromptInput {
  request: GenerateRequest;
  cityContext: CityContext;
  outputSchemaExample: string;
}

export interface JsonGenerationInput {
  systemPrompt: string;
  userPrompt: string;
}

export interface LlmProvider {
  readonly name: string;
  generateJson(input: JsonGenerationInput): Promise<unknown>;
}
