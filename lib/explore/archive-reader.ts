import type { TripPlanDraft } from "../trip/types";
import { buildTripPlanDraftFromExplore } from "./to-trip-draft";
import type {
  ExploreTripContent,
  ExploreTripDayContent,
  ExploreTripFood,
  ExploreTripPoi,
} from "./types";
import {
  getArchiveCoverImageCandidates,
  getArchiveFoodImageCandidates,
  getArchivePlaceImageCandidates,
} from "./image-resolver";
import {
  cleanDisplayList,
  cleanDisplayText,
  formatTripTypeLabel,
} from "./archive-display";

export interface ArchiveReaderFoodRecord extends ExploreTripFood {
  imageCandidates: string[];
  imageUrl?: string;
}

export interface ArchiveReaderPlaceRecord extends ExploreTripPoi {
  imageCandidates: string[];
  imageUrl?: string;
}

export interface ArchiveReaderViewModel {
  id: string;
  slug: string;
  externalId: string;
  title: string;
  city: string;
  cityCode: string;
  region?: string;
  summary: string;
  theme?: string;
  tripType: string;
  days: number;
  pace?: string;
  budgetLevel?: string;
  budgetNote?: string;
  tags: string[];
  recommendedFor: string[];
  coverImage: string;
  coverImageUrl?: string;
  galleryImages: string[];
  story: string;
  featuredReason?: string;
  highlights: string[];
  dailyItinerary: ExploreTripDayContent[];
  food: ArchiveReaderFoodRecord[];
  places: ArchiveReaderPlaceRecord[];
  createDraftSeed: TripPlanDraft;
  creatorType?: ExploreTripContent["creatorType"];
  creator?: string;
  likes?: number;
  views?: number;
  savedCount?: number;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => cleanDisplayText(value)).filter(Boolean)),
  );
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
}

function readRawValue(rawContent: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = rawContent[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function readRawString(rawContent: Record<string, unknown>, keys: string[]) {
  return cleanDisplayText(readRawValue(rawContent, keys));
}

function readRawStringArray(rawContent: Record<string, unknown>, keys: string[]) {
  const value = readRawValue(rawContent, keys);
  return normalizeStringArray(value);
}

function inferRecommendedFromTags(tags: string[]) {
  const joined = tags.join(" ").toLowerCase();
  const inferred: string[] = [];

  if (joined.includes("couple")) {
    inferred.push("情侣");
  }
  if (joined.includes("family")) {
    inferred.push("家庭");
  }
  if (joined.includes("friend")) {
    inferred.push("朋友");
  }
  if (joined.includes("solo")) {
    inferred.push("独旅");
  }
  if (joined.includes("student")) {
    inferred.push("学生");
  }

  return uniqueStrings(inferred);
}

function inferRecommendedFromTripType(tripType: string) {
  switch (tripType.toLowerCase()) {
    case "couple":
      return ["情侣"];
    case "family":
      return ["亲子", "家庭"];
    case "solo":
      return ["独旅"];
    case "student":
      return ["学生", "朋友"];
    default:
      return [];
  }
}

function buildDisplayTags(input: ExploreTripContent) {
  const rawExtraTags = readRawStringArray(input.rawContent, [
    "terrainTags",
    "terrain_tags",
    "cuisineTags",
    "cuisine_tags",
    "seasonTags",
    "season_tags",
    "companionTags",
    "companion_tags",
  ]);

  return uniqueStrings([
    ...input.tags,
    ...(input.terrainTags ?? []),
    ...(input.cuisineTags ?? []),
    ...(input.seasonTags ?? []),
    ...(input.companionTags ?? []),
    ...rawExtraTags,
  ]);
}

function buildRecommendedFor(input: ExploreTripContent, displayTags: string[]) {
  const rawRecommended = readRawStringArray(input.rawContent, [
    "recommendedFor",
    "recommended_for",
    "companions",
    "companionTags",
    "companion_tags",
  ]);

  return uniqueStrings([
    ...rawRecommended,
    ...(input.companionTags ?? []),
    ...inferRecommendedFromTripType(input.tripType),
    ...inferRecommendedFromTags(displayTags),
  ]);
}

function buildStory(input: ExploreTripContent) {
  return (
    cleanDisplayText(input.archiveIntro) ||
    readRawString(input.rawContent, [
      "archiveIntro",
      "archive_intro",
      "story",
      "description",
      "intro",
    ]) ||
    cleanDisplayText(input.summary, "这份旅行档案正在整理中。")
  );
}

function buildFeaturedReason(input: ExploreTripContent) {
  return (
    cleanDisplayText(input.featuredReason) ||
    readRawString(input.rawContent, ["featuredReason", "featured_reason", "why"])
  );
}

function buildGalleryImages(input: ExploreTripContent) {
  const rawGallery = readRawStringArray(input.rawContent, [
    "galleryImages",
    "gallery_images",
    "gallery",
    "images",
    "photos",
  ]);
  const coverCandidates = getArchiveCoverImageCandidates(input);

  return uniqueStrings([...rawGallery, ...coverCandidates]).slice(0, 6);
}

function buildFallbackRecordId(prefix: string, slug: string, index: number) {
  return `${slug}-${prefix}-${index + 1}`;
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeFallbackFoodRecord(
  value: unknown,
  input: ExploreTripContent,
  index: number,
): ExploreTripFood | null {
  if (typeof value === "string" && cleanDisplayText(value)) {
    return {
      id: buildFallbackRecordId("food", input.slug, index),
      name: cleanDisplayText(value),
      reason: `${input.city} 的这段路线里，可以留一顿给这类味道。`,
      district: cleanDisplayText(input.city),
      category: "local",
    };
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const name =
    cleanDisplayText(record.name) ||
    cleanDisplayText(record.title) ||
    cleanDisplayText(record.label);

  if (!name) {
    return null;
  }

  return {
    id: cleanDisplayText(record.id, buildFallbackRecordId("food", input.slug, index)),
    name,
    reason:
      cleanDisplayText(record.reason) ||
      `${input.city} 的这段路线里，可以留一顿给这类味道。`,
    district: cleanDisplayText(record.district, input.city),
    category: cleanDisplayText(record.category, "local"),
  };
}

function normalizeFallbackPlaceRecord(
  value: unknown,
  input: ExploreTripContent,
  index: number,
): ExploreTripPoi | null {
  if (typeof value === "string" && cleanDisplayText(value)) {
    return {
      id: buildFallbackRecordId("place", input.slug, index),
      name: cleanDisplayText(value),
      reason: `${input.city} 这条路线会围绕这里展开。`,
      district: cleanDisplayText(input.city),
      type: "sight",
    };
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const name =
    cleanDisplayText(record.name) ||
    cleanDisplayText(record.title) ||
    cleanDisplayText(record.label);

  if (!name) {
    return null;
  }

  return {
    id: cleanDisplayText(record.id, buildFallbackRecordId("place", input.slug, index)),
    name,
    reason:
      cleanDisplayText(record.reason) ||
      `${input.city} 这条路线会围绕这里展开。`,
    district: cleanDisplayText(record.district, input.city),
    type: cleanDisplayText(record.type, "sight"),
    recommendedDurationMinutes:
      typeof record.recommendedDurationMinutes === "number"
        ? record.recommendedDurationMinutes
        : typeof record.recommended_duration_minutes === "number"
          ? record.recommended_duration_minutes
          : undefined,
  };
}

function buildFoodRecords(input: ExploreTripContent): ArchiveReaderFoodRecord[] {
  const fallbackFood =
    input.food.length > 0
      ? input.food
      : (
          readRawValue(input.rawContent, [
            "food",
            "foodNotes",
            "food_notes",
            "cuisines",
          ]) as unknown[] | undefined
        )
          ?.map((value, index) => normalizeFallbackFoodRecord(value, input, index))
          .filter((value): value is ExploreTripFood => value !== null) ?? [];

  return fallbackFood.map((food) => ({
    ...food,
    id: cleanDisplayText(food.id, `${input.slug}-food`),
    name: cleanDisplayText(food.name, "在地风味"),
    reason: cleanDisplayText(food.reason, "这一站适合留一顿给当地味道。"),
    district: cleanDisplayText(food.district),
    category: cleanDisplayText(food.category),
    imageUrl: cleanDisplayText((food as { imageUrl?: unknown }).imageUrl),
    imageCandidates: getArchiveFoodImageCandidates(food),
  }));
}

function buildPlaceRecords(input: ExploreTripContent): ArchiveReaderPlaceRecord[] {
  const fallbackPlaces =
    input.pois.length > 0
      ? input.pois
      : (
          readRawValue(input.rawContent, [
            "pois",
            "poi",
            "places",
            "placeRecords",
            "place_records",
          ]) as unknown[] | undefined
        )
          ?.map((value, index) => normalizeFallbackPlaceRecord(value, input, index))
          .filter((value): value is ExploreTripPoi => value !== null) ?? [];

  return fallbackPlaces.map((place) => ({
    ...place,
    id: cleanDisplayText(place.id, `${input.slug}-place`),
    name: cleanDisplayText(place.name, "路线节点"),
    reason: cleanDisplayText(place.reason, "这一站可以按当天状态灵活停留。"),
    district: cleanDisplayText(place.district),
    type: cleanDisplayText(place.type),
    imageUrl: cleanDisplayText((place as { imageUrl?: unknown }).imageUrl),
    imageCandidates: getArchivePlaceImageCandidates(input),
  }));
}

function buildHighlights(input: ExploreTripContent) {
  const rawHighlights = readRawStringArray(input.rawContent, [
    "highlights",
    "highlightRecords",
    "highlight_records",
  ]);

  const derivedHighlights = [
    ...input.dailyItinerary.map((day) => day.title),
    ...input.pois.map((poi) => poi.name),
    ...input.food.map((food) => food.name),
    ...input.tags,
  ];

  const cleaned = uniqueStrings([
    ...input.highlights,
    ...rawHighlights,
    ...derivedHighlights,
  ]).slice(0, 8);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return cleanDisplayList(
    [
      `${input.city} 的城市气质`,
      `${formatTripTypeLabel(input.tripType)}适合的路线灵感`,
      `${input.days} 天旅行预览`,
    ],
    ["这份档案适合慢慢读完，再按自己的节奏微调。"],
  ).slice(0, 3);
}

function buildDailyItinerary(input: ExploreTripContent) {
  if (input.dailyItinerary.length > 0) {
    return input.dailyItinerary.map((day, dayIndex) => ({
      ...day,
      dayNumber:
        typeof day.dayNumber === "number" && Number.isFinite(day.dayNumber)
          ? day.dayNumber
          : dayIndex + 1,
      title: cleanDisplayText(day.title, `第 ${dayIndex + 1} 天`),
      summary: cleanDisplayText(day.summary, "按当天节奏慢慢走，不必排得太满。"),
      activities: day.activities.map((activity) => ({
        ...activity,
        timeBlock: cleanDisplayText(activity.timeBlock, "行程"),
        description: cleanDisplayText(
          activity.description,
          "保留弹性时间，按当天状态微调。",
        ),
        poiRefs: Array.isArray(activity.poiRefs) ? activity.poiRefs : [],
        foodRefs: Array.isArray(activity.foodRefs) ? activity.foodRefs : [],
      })),
    }));
  }

  const rawDays = readRawValue(input.rawContent, [
    "dailyItinerary",
    "daily_itinerary",
    "itinerary",
    "schedule",
  ]);

  return Array.isArray(rawDays) ? (rawDays as ExploreTripDayContent[]) : [];
}

export function normalizeExploreArchiveForReader(
  input: ExploreTripContent,
): ArchiveReaderViewModel {
  const title = cleanDisplayText(input.title, `${input.cityCode} 旅行档案`);
  const city = cleanDisplayText(input.city, input.cityCode);
  const cityCode = cleanDisplayText(input.cityCode, "archive");
  const summary = cleanDisplayText(input.summary, "这份旅行档案正在整理中。");
  const tags = buildDisplayTags(input);
  const recommendedFor = buildRecommendedFor(input, tags);
  const story = buildStory(input);
  const featuredReason = buildFeaturedReason(input);
  const galleryImages = buildGalleryImages(input);
  const coverImageUrl = cleanDisplayText(input.coverImageUrl);
  const coverImage =
    coverImageUrl ||
    galleryImages[0] ||
    "/images/explore/fallback/explore-fallback-city.png";

  return {
    id: cleanDisplayText(input.id, input.slug),
    slug: cleanDisplayText(input.slug, input.id),
    externalId: cleanDisplayText(input.externalId, input.id),
    title,
    city,
    cityCode,
    region: cleanDisplayText(input.region),
    summary,
    theme: cleanDisplayText(input.theme),
    tripType: cleanDisplayText(input.tripType, "free"),
    days: typeof input.days === "number" && Number.isFinite(input.days) ? input.days : 1,
    pace: cleanDisplayText(input.pace),
    budgetLevel: cleanDisplayText(input.budgetLevel),
    budgetNote: cleanDisplayText(input.budgetNote),
    tags,
    recommendedFor,
    coverImage,
    coverImageUrl,
    galleryImages,
    story,
    featuredReason,
    highlights: buildHighlights(input),
    dailyItinerary: buildDailyItinerary(input),
    food: buildFoodRecords(input),
    places: buildPlaceRecords(input),
    createDraftSeed: buildTripPlanDraftFromExplore(input),
    creatorType: input.creatorType,
    creator: cleanDisplayText(input.creator),
    likes: input.likes,
    views: input.views,
    savedCount: input.savedCount,
  };
}
