import {
  exploreImportOptionsSchema,
  pipelineExploreTripSchema,
} from "./schema.ts";
import type {
  ExploreImportOptions,
  ExploreTripContentInsert,
  ExploreTripDailyActivity,
  ExploreTripDayContent,
  ExploreTripFood,
  ExploreTripPoi,
} from "./types.ts";

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function slugifySegment(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeActivity(activity: {
  time_block: string;
  description: string;
  poi_refs?: string[];
  food_refs?: string[];
}): ExploreTripDailyActivity {
  return {
    timeBlock: activity.time_block,
    description: activity.description,
    poiRefs: activity.poi_refs ?? [],
    foodRefs: activity.food_refs ?? [],
  };
}

function normalizeDayContent(
  day: {
    title: string;
    summary: string;
    activities: {
      time_block: string;
      description: string;
      poi_refs?: string[];
      food_refs?: string[];
    }[];
  },
  index: number,
): ExploreTripDayContent {
  return {
    dayNumber: index + 1,
    title: day.title,
    summary: day.summary,
    activities: day.activities.map(normalizeActivity),
  };
}

function normalizePoi(item: {
  id: string;
  name: string;
  district?: string;
  type?: string;
  reason: string;
  recommended_duration_minutes?: number;
}): ExploreTripPoi {
  return {
    id: item.id,
    name: item.name,
    district: item.district,
    type: item.type,
    reason: item.reason,
    recommendedDurationMinutes: item.recommended_duration_minutes,
  };
}

function normalizeFood(item: {
  id: string;
  name: string;
  district?: string;
  category?: string;
  reason: string;
}): ExploreTripFood {
  return {
    id: item.id,
    name: item.name,
    district: item.district,
    category: item.category,
    reason: item.reason,
  };
}

function deriveHighlights(input: {
  tags: string[];
  itineraryDays: ExploreTripDayContent[];
  pois: ExploreTripPoi[];
  food: ExploreTripFood[];
}) {
  const highlights = dedupeStrings([
    ...input.tags.slice(0, 3),
    ...input.itineraryDays.map((day) => day.title).slice(0, 2),
    ...input.pois.map((poi) => poi.name).slice(0, 2),
    ...input.food.map((item) => item.name).slice(0, 1),
  ]);

  return highlights.slice(0, 6);
}

export function buildExploreTripSlug(input: {
  cityCode: string;
  title: string;
  days: number;
}) {
  const citySegment = slugifySegment(input.cityCode);
  const titleSegment = slugifySegment(input.title);
  const base = [citySegment, titleSegment, `${input.days}d`]
    .filter(Boolean)
    .join("-");

  return base || `explore-trip-${input.days}d`;
}

export function parsePipelineExploreTrip(raw: Record<string, unknown>) {
  const record = asRecord(raw) ?? {};
  const normalized = {
    ...record,
    pois: Array.isArray(record.pois)
      ? record.pois
      : Array.isArray(record.poi)
        ? record.poi
        : Array.isArray(record.POI)
          ? record.POI
          : [],
    food: Array.isArray(record.food) ? record.food : [],
    raw,
  };

  return pipelineExploreTripSchema.parse(normalized);
}

export function buildExploreTripImport(
  raw: Record<string, unknown>,
  options?: ExploreImportOptions,
): ExploreTripContentInsert {
  const parsed = parsePipelineExploreTrip(raw);
  const importOptions = exploreImportOptionsSchema.parse(options ?? {});
  const itineraryDays = parsed.daily_itinerary.map(normalizeDayContent);
  const pois = (parsed.pois ?? []).map(normalizePoi);
  const food = (parsed.food ?? []).map(normalizeFood);
  const highlights = deriveHighlights({
    tags: parsed.tags ?? [],
    itineraryDays,
    pois,
    food,
  });

  return {
    externalId: parsed.id,
    slug:
      parsed.slug ||
      buildExploreTripSlug({
        cityCode: parsed.city.code,
        title: parsed.title,
        days: parsed.days,
      }),
    title: parsed.title,
    summary: parsed.summary,
    city: parsed.city.name,
    cityCode: parsed.city.code,
    region: parsed.city.region_name,
    tripType: parsed.trip_type,
    days: parsed.days,
    tags: parsed.tags ?? [],
    theme: parsed.theme,
    pace: parsed.pace,
    budgetLevel: parsed.budget?.level,
    budgetNote: parsed.budget?.note,
    imagePrompt: parsed.image_prompt,
    archiveIntro: parsed.archive_intro,
    featured: parsed.featured,
    featuredReason: parsed.featured_reason,
    creatorType: parsed.creator_type,
    creatorId: parsed.creator_id,
    creator: parsed.creator,
    likes: parsed.likes,
    views: parsed.views,
    savedCount: parsed.saved_count,
    terrainTags: parsed.terrain_tags,
    cuisineTags: parsed.cuisine_tags,
    seasonTags: parsed.season_tags,
    companionTags: parsed.companion_tags,
    highlights,
    dailyItinerary: itineraryDays,
    pois,
    food,
    status: importOptions.status ?? "draft",
    reviewStatus: importOptions.reviewStatus ?? "pending",
    source: {
      pipeline: "travel-content-pipeline",
      batchId: importOptions.batchId,
      sourceContentKey: importOptions.sourceContentKey ?? parsed.id,
      sourceFilePath: importOptions.sourceFilePath,
    },
    rawContent: parsed.raw,
    publishedAt: importOptions.publishedAt,
  };
}

export function buildExploreTripImportBatch(
  rows: Record<string, unknown>[],
  options?: ExploreImportOptions,
) {
  return rows.map((row, index) =>
    buildExploreTripImport(row, {
      ...options,
      sourceContentKey:
        options?.sourceContentKey ??
        (asString(row.id) || `pipeline-item-${index + 1}`),
    }),
  );
}
