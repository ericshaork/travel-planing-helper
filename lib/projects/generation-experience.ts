import loadingMessagesData from "../../public/images/loading/quotes/loading_messages.json";
import travelQuotesData from "../../public/images/loading/quotes/travel_quotes.json";

export type GenerationExperienceStatus = "generating" | "success" | "error";

export type GenerationMessageTheme =
  | "general"
  | "city"
  | "coastal"
  | "nature"
  | "culture"
  | "food";

export interface GenerationLoadingMessages {
  general: string[];
  city: string[];
  coastal: string[];
  nature: string[];
  culture: string[];
  food: string[];
}

export interface GenerationQuoteItem {
  text: string;
  author: string;
}

export interface GenerationQuotesByTheme {
  general: GenerationQuoteItem[];
  city: GenerationQuoteItem[];
  coastal: GenerationQuoteItem[];
  nature: GenerationQuoteItem[];
  culture: GenerationQuoteItem[];
  food: GenerationQuoteItem[];
}

export interface GenerationProgressStage {
  id: string;
  label: string;
  detail: string;
  progressTarget: number;
}

export const GENERATION_TOP_FRAME_SRC =
  "/images/loading/loading_top_blank.png";
export const GENERATION_BOTTOM_FRAME_SRC =
  "/images/loading/loading_bottom_blank.png";

export const GENERATION_WATERCOLOR_IMAGES = [
  "/images/loading/watercolor/loading_01_coastal_sunset.png",
  "/images/loading/watercolor/loading_02_alpine_lake_valley.png",
  "/images/loading/watercolor/loading_03_japanese_old_town.png",
  "/images/loading/watercolor/loading_04_rural_train.png",
  "/images/loading/watercolor/loading_05_paris_rainy_street.png",
  "/images/loading/watercolor/loading_06_desert_highway.png",
  "/images/loading/watercolor/loading_07_train_across_fields.png",
  "/images/loading/watercolor/loading_08_car_mountain_bridge.png",
  "/images/loading/watercolor/loading_09_ocean_road_trip.png",
  "/images/loading/watercolor/loading_10_vintage_station.png",
  "/images/loading/watercolor/loading_11_mountain_trail.png",
  "/images/loading/watercolor/loading_12_city_arrival.png",
  "/images/loading/watercolor/loading_13_island_coast.png",
  "/images/loading/watercolor/loading_14_mountain_village.png",
  "/images/loading/watercolor/loading_15_historic_city_lane.png",
  "/images/loading/watercolor/loading_16_lakeside_town.png",
  "/images/loading/watercolor/loading_17_forest_road.png",
  "/images/loading/watercolor/loading_18_distant_journey.png",
] as const;

export const GENERATION_PROGRESS_STAGES: GenerationProgressStage[] = [
  {
    id: "brief",
    label: "Organizing your brief",
    detail:
      "Gathering the preferences, pace, and constraints you confirmed with Wanderly.",
    progressTarget: 18,
  },
  {
    id: "proposal",
    label: "Shaping preferences",
    detail:
      "Turning the proposal direction into a cleaner request for full-trip generation.",
    progressTarget: 38,
  },
  {
    id: "structure",
    label: "Arranging the route",
    detail:
      "Balancing route order, daily focus, and breathing room across the trip.",
    progressTarget: 62,
  },
  {
    id: "workspace",
    label: "Drafting the workspace plan",
    detail:
      "Packing the itinerary into a version that Workspace can open and edit directly.",
    progressTarget: 84,
  },
  {
    id: "handoff",
    label: "Preparing handoff",
    detail:
      "Finishing the project version and workspace context before opening the plan.",
    progressTarget: 96,
  },
] as const;

export const FALLBACK_LOADING_MESSAGES: GenerationLoadingMessages = {
  general: [
    "Organizing your route notes.",
    "Turning the conversation into a fuller travel draft.",
    "Pulling the trip into one cleaner planning direction.",
  ],
  city: [
    "Linking neighborhoods, stops, and city-walk moments.",
    "Tidying an easier city rhythm for this trip.",
    "Sketching a slower route through the streets you may enjoy most.",
  ],
  coastal: [
    "Leaving more room for shoreline stops and slower sea-view time.",
    "Looking for a route that feels better with coast, breeze, and light.",
    "Sketching a softer seaside version of the trip.",
  ],
  nature: [
    "Balancing scenery, moving distance, and time to stay a little longer.",
    "Reordering the route for a calmer nature-facing pace.",
    "Tidying a more relaxed path between landscapes.",
  ],
  culture: [
    "Linking stories, old streets, museums, and local texture.",
    "Shaping a route with a little more place memory in it.",
    "Collecting the stops that make the trip feel more rooted.",
  ],
  food: [
    "Saving more honest space for meals and local flavors.",
    "Tidying a route that is easier to taste your way through.",
    "Writing the worthwhile food stops back into the plan.",
  ],
};

export const FALLBACK_TRAVEL_QUOTES: GenerationQuotesByTheme = {
  general: [
    {
      text: "Every departure is another chance to see the world a little differently.",
      author: "Wanderly Journal",
    },
    {
      text: "A trip often begins as nothing more than one small idea worth following.",
      author: "Wanderly Journal",
    },
  ],
  city: [
    {
      text: "Walk slowly enough, and a city will tell you its own name.",
      author: "Wanderly Journal",
    },
  ],
  coastal: [
    {
      text: "Sometimes the journey really starts when the sea air arrives.",
      author: "Wanderly Journal",
    },
  ],
  nature: [
    {
      text: "You meet unfamiliar landscapes only after leaving familiar roads.",
      author: "Wanderly Journal",
    },
  ],
  culture: [
    {
      text: "To know a place, begin with the stories it kept.",
      author: "Wanderly Journal",
    },
  ],
  food: [
    {
      text: "Some places stay with you from the very first bite.",
      author: "Wanderly Journal",
    },
  ],
};

export const LOADING_MESSAGES_DATA =
  loadingMessagesData as GenerationLoadingMessages;

export const TRAVEL_QUOTES_DATA = {
  ...FALLBACK_TRAVEL_QUOTES,
  ...(travelQuotesData as Partial<GenerationQuotesByTheme>),
} as GenerationQuotesByTheme;

const FOOD_KEYWORDS = [
  "food",
  "restaurant",
  "cafe",
  "coffee",
  "brunch",
  "taste",
  "eat",
  "美食",
  "吃",
] as const;

const CULTURE_KEYWORDS = [
  "culture",
  "museum",
  "history",
  "historic",
  "art",
  "architecture",
  "文化",
  "历史",
] as const;

const COASTAL_KEYWORDS = [
  "beach",
  "sea",
  "ocean",
  "coast",
  "island",
  "海",
  "海边",
] as const;

const NATURE_KEYWORDS = [
  "mountain",
  "nature",
  "forest",
  "lake",
  "hike",
  "landscape",
  "山",
  "自然",
] as const;

const CITY_KEYWORDS = [
  "city",
  "citywalk",
  "street",
  "walk",
  "urban",
  "neighborhood",
  "城市",
  "街区",
] as const;

function containsKeyword(input: string, keywords: readonly string[]) {
  const normalized = input.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function resolveGenerationMessageTheme(input: {
  latestUserMessage?: string;
  destination?: string;
}): GenerationMessageTheme {
  const combined = [input.latestUserMessage, input.destination]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(" ");

  if (!combined) {
    return "general";
  }

  if (containsKeyword(combined, FOOD_KEYWORDS)) {
    return "food";
  }

  if (containsKeyword(combined, COASTAL_KEYWORDS)) {
    return "coastal";
  }

  if (containsKeyword(combined, CULTURE_KEYWORDS)) {
    return "culture";
  }

  if (containsKeyword(combined, NATURE_KEYWORDS)) {
    return "nature";
  }

  if (containsKeyword(combined, CITY_KEYWORDS)) {
    return "city";
  }

  return "general";
}
