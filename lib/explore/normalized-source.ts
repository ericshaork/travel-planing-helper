import normalizedArchivesJson from "@/data/explore/normalized/explore_archives_v1.json";

import { filterV18ExploreVisibleArchives } from "./display";
import type {
  ExploreTripContent,
  ExploreTripFood,
  ExploreTripListFilters,
  ExploreTripListItem,
  ExploreTripPoi,
} from "./types";

type NormalizedHighlightRecord = {
  title: string;
  description: string;
  tag: string;
};

type NormalizedDayActivity = {
  timeBlock: string;
  label?: string;
  description: string;
  poiRefs: string[];
  foodRefs: string[];
};

type NormalizedDayRecord = {
  dayNumber: number;
  title: string;
  summary: string;
  activities: NormalizedDayActivity[];
};

type NormalizedFoodRecord = {
  id: string;
  name: string;
  description: string;
  type: string;
  district: string;
  imageUrl: string;
};

type NormalizedPlaceRecord = {
  id: string;
  name: string;
  description: string;
  type: string;
  district: string;
  imageUrl: string;
  recommendedDurationMinutes?: number;
};

export interface NormalizedExploreArchive {
  externalId: string;
  slug: string;
  sourceSlug: string;
  title: string;
  summary: string;
  city: string;
  cityCode: string;
  region: string;
  theme: string;
  tripType: string;
  days: number;
  pace: string;
  budgetLevel: string;
  budgetNote: string;
  tags: string[];
  recommendedFor: string[];
  coverImageUrl: string;
  galleryImages: string[];
  story: string;
  featuredReason: string;
  highlights: NormalizedHighlightRecord[];
  dailyItinerary: NormalizedDayRecord[];
  food: NormalizedFoodRecord[];
  places: NormalizedPlaceRecord[];
  imagePrompt: string;
  source: {
    type: "ai_generated_v1";
    sourceFile: string;
    sourceVersion: "v1";
  };
}

const FEATURED_CITY_ORDER = [
  "beijing",
  "shanghai",
  "xian",
  "xiamen",
  "chengdu",
  "hangzhou",
  "guangzhou",
  "shenzhen",
  "chongqing",
  "qingdao",
  "sanya",
  "suzhou",
  "nanjing",
  "dali",
  "lijiang",
] as const;

const FEATURED_THEME_ORDER = [
  "citywalk",
  "food",
  "heritage",
  "night",
  "seaside",
  "jiangnan",
  "nature",
  "romance",
] as const;

const NORMALIZED_ARCHIVES = normalizedArchivesJson as NormalizedExploreArchive[];

const normalizedArchiveBySlug = new Map(
  NORMALIZED_ARCHIVES.map((item) => [item.slug, item]),
);
const normalizedArchiveBySourceSlug = new Map(
  NORMALIZED_ARCHIVES.map((item) => [item.sourceSlug, item]),
);
const normalizedArchiveByExternalId = new Map(
  NORMALIZED_ARCHIVES.map((item) => [item.externalId, item]),
);

function normalizeSearchText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function asOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildTerrainTags(item: NormalizedExploreArchive) {
  const terrain = new Set<string>();

  if (["heritage", "citywalk", "jiangnan"].includes(item.theme)) {
    terrain.add("城市漫步");
  }
  if (["seaside"].includes(item.theme)) {
    terrain.add("海边");
  }
  if (["nature", "mountain"].includes(item.theme)) {
    terrain.add("山水");
  }
  if (["lake", "jiangnan"].includes(item.theme)) {
    terrain.add("湖景");
  }

  for (const tag of item.tags) {
    if (
      ["citywalk", "old-town", "hutong-life", "old-street"].includes(tag)
    ) {
      terrain.add("城市漫步");
    }
    if (["coastal-city", "beach", "bay-view"].includes(tag)) {
      terrain.add("海边");
    }
    if (["nature", "karst-scenery", "desert-scenery"].includes(tag)) {
      terrain.add("山水");
    }
    if (["lake-view", "canal-walk"].includes(tag)) {
      terrain.add("湖景");
    }
  }

  return Array.from(terrain);
}

function buildCuisineTags(item: NormalizedExploreArchive) {
  const cuisine = new Set<string>();

  if (item.theme === "food") {
    cuisine.add("美食");
  }

  for (const tag of item.tags) {
    if (
      ["food", "street-food", "local-food", "night-market", "morning-tea"].includes(tag)
    ) {
      cuisine.add("美食");
    }
  }

  for (const food of item.food) {
    if (food.type) {
      cuisine.add(food.type);
    }
  }

  return Array.from(cuisine);
}

function buildSeasonTags(item: NormalizedExploreArchive) {
  return item.tags.filter((tag) =>
    ["spring", "summer", "autumn", "winter", "夏日"].includes(tag),
  );
}

function buildCompanionTags(item: NormalizedExploreArchive) {
  return item.recommendedFor.filter(Boolean);
}

function mapNormalizedFood(item: NormalizedFoodRecord): ExploreTripFood {
  return {
    id: item.id,
    name: item.name,
    district: asOptionalText(item.district),
    category: asOptionalText(item.type),
    reason: item.description,
  };
}

function mapNormalizedPlace(item: NormalizedPlaceRecord): ExploreTripPoi {
  return {
    id: item.id,
    name: item.name,
    district: asOptionalText(item.district),
    type: asOptionalText(item.type),
    reason: item.description,
    recommendedDurationMinutes: item.recommendedDurationMinutes,
  };
}

function getFeaturedRank(item: NormalizedExploreArchive) {
  const cityRank = FEATURED_CITY_ORDER.indexOf(
    item.cityCode as (typeof FEATURED_CITY_ORDER)[number],
  );
  const themeRank = FEATURED_THEME_ORDER.indexOf(
    item.theme as (typeof FEATURED_THEME_ORDER)[number],
  );

  return {
    cityRank: cityRank === -1 ? FEATURED_CITY_ORDER.length : cityRank,
    themeRank: themeRank === -1 ? FEATURED_THEME_ORDER.length : themeRank,
  };
}

export function mapNormalizedArchiveToExploreContent(
  item: NormalizedExploreArchive,
): ExploreTripContent {
  const featuredRank = getFeaturedRank(item);
  const featured = featuredRank.cityRank < 12 || featuredRank.themeRank < 6;

  return {
    id: item.externalId,
    externalId: item.externalId,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    city: item.city,
    cityCode: item.cityCode,
    region: asOptionalText(item.region),
    tripType: item.tripType,
    days: item.days,
    tags: item.tags,
    theme: asOptionalText(item.theme),
    pace: asOptionalText(item.pace),
    budgetLevel: asOptionalText(item.budgetLevel),
    budgetNote: asOptionalText(item.budgetNote),
    coverImageUrl: asOptionalText(item.coverImageUrl),
    imagePrompt: asOptionalText(item.imagePrompt),
    archiveIntro: asOptionalText(item.story),
    featured,
    featuredReason: asOptionalText(item.featuredReason),
    creatorType: "ai_generated",
    creatorId: "wanderly-normalized",
    creator: "Wanderly v1.8",
    likes: 0,
    views: 0,
    savedCount: 0,
    terrainTags: buildTerrainTags(item),
    cuisineTags: buildCuisineTags(item),
    seasonTags: buildSeasonTags(item),
    companionTags: buildCompanionTags(item),
    highlights: item.highlights.map((highlight) => highlight.title),
    dailyItinerary: item.dailyItinerary.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      summary: day.summary,
      activities: day.activities.map((activity) => ({
        timeBlock: activity.timeBlock,
        description: activity.description,
        poiRefs: activity.poiRefs,
        foodRefs: activity.foodRefs,
      })),
    })),
    pois: item.places.map(mapNormalizedPlace),
    food: item.food.map(mapNormalizedFood),
    status: "published",
    reviewStatus: "approved",
    source: {
      pipeline: "travel-content-pipeline",
      batchId: "normalized-v1",
      sourceContentKey: item.sourceSlug,
      sourceFilePath: item.source.sourceFile,
    },
    rawContent: {
      sourceSlug: item.sourceSlug,
      recommendedFor: item.recommendedFor,
      story: item.story,
      featuredReason: item.featuredReason,
      galleryImages: item.galleryImages,
      highlights: item.highlights,
      places: item.places,
      food: item.food,
    },
    publishedAt: "2026-07-14T00:00:00.000Z",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  };
}

export function mapNormalizedArchiveToExploreListItem(
  item: NormalizedExploreArchive,
): ExploreTripListItem {
  const content = mapNormalizedArchiveToExploreContent(item);

  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    city: content.city,
    cityCode: content.cityCode,
    region: content.region,
    tripType: content.tripType,
    days: content.days,
    tags: content.tags,
    theme: content.theme,
    pace: content.pace,
    coverImageUrl: content.coverImageUrl,
    archiveIntro: content.archiveIntro,
    featured: content.featured,
    featuredReason: content.featuredReason,
    creatorType: content.creatorType,
    creatorId: content.creatorId,
    creator: content.creator,
    likes: content.likes,
    views: content.views,
    savedCount: content.savedCount,
    terrainTags: content.terrainTags,
    cuisineTags: content.cuisineTags,
    seasonTags: content.seasonTags,
    companionTags: content.companionTags,
    highlights: content.highlights,
  };
}

function matchesFilters(item: NormalizedExploreArchive, filters: ExploreTripListFilters) {
  if (filters.city) {
    const query = normalizeSearchText(filters.city);
    const haystacks = [item.city, item.cityCode, item.region]
      .map(normalizeSearchText)
      .filter(Boolean);

    if (!haystacks.some((value) => value === query || value.includes(query))) {
      return false;
    }
  }

  if (filters.tripType && item.tripType !== filters.tripType) {
    return false;
  }

  if (typeof filters.days === "number" && item.days !== filters.days) {
    return false;
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagSet = new Set(item.tags.map((tag) => normalizeSearchText(tag)));
    if (!filters.tags.every((tag) => tagSet.has(normalizeSearchText(tag)))) {
      return false;
    }
  }

  const content = mapNormalizedArchiveToExploreContent(item);

  if (filters.terrain && filters.terrain.length > 0) {
    const terrainSet = new Set((content.terrainTags ?? []).map(normalizeSearchText));
    if (!filters.terrain.some((tag) => terrainSet.has(normalizeSearchText(tag)))) {
      return false;
    }
  }

  if (filters.cuisine && filters.cuisine.length > 0) {
    const cuisineSet = new Set((content.cuisineTags ?? []).map(normalizeSearchText));
    if (!filters.cuisine.some((tag) => cuisineSet.has(normalizeSearchText(tag)))) {
      return false;
    }
  }

  if (filters.season && filters.season.length > 0) {
    const seasonSet = new Set((content.seasonTags ?? []).map(normalizeSearchText));
    if (!filters.season.some((tag) => seasonSet.has(normalizeSearchText(tag)))) {
      return false;
    }
  }

  if (filters.companion && filters.companion.length > 0) {
    const companionSet = new Set((content.companionTags ?? []).map(normalizeSearchText));
    if (!filters.companion.some((tag) => companionSet.has(normalizeSearchText(tag)))) {
      return false;
    }
  }

  if (typeof filters.featured === "boolean") {
    const isFeatured = Boolean(content.featured);
    if (filters.featured !== isFeatured) {
      return false;
    }
  }

  return true;
}

function buildSearchableText(item: NormalizedExploreArchive) {
  return [
    item.title,
    item.summary,
    item.city,
    item.cityCode,
    item.region,
    item.theme,
    item.tripType,
    item.pace,
    ...item.tags,
    ...item.recommendedFor,
    ...item.highlights.map((highlight) => highlight.title),
    ...item.highlights.map((highlight) => highlight.description),
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");
}

function sortFeatured(items: NormalizedExploreArchive[]) {
  return [...items].sort((left, right) => {
    const leftRank = getFeaturedRank(left);
    const rightRank = getFeaturedRank(right);

    if (leftRank.cityRank !== rightRank.cityRank) {
      return leftRank.cityRank - rightRank.cityRank;
    }

    if (leftRank.themeRank !== rightRank.themeRank) {
      return leftRank.themeRank - rightRank.themeRank;
    }

    if (left.days !== right.days) {
      return left.days - right.days;
    }

    return left.title.localeCompare(right.title, "zh-CN");
  });
}

export function getNormalizedExploreArchives(filters: ExploreTripListFilters = {}) {
  const visibleItems = filterV18ExploreVisibleArchives(NORMALIZED_ARCHIVES);
  const filteredItems = visibleItems.filter((item) => matchesFilters(item, filters));

  if (typeof filters.limit === "number" && filters.limit > 0) {
    return filteredItems.slice(0, filters.limit);
  }

  return filteredItems;
}

export function getNormalizedExploreArchiveBySlug(slug: string) {
  const normalized = slug.trim();
  return (
    normalizedArchiveBySlug.get(normalized) ??
    normalizedArchiveBySourceSlug.get(normalized) ??
    null
  );
}

export function getNormalizedExploreArchiveByExternalId(externalId: string) {
  return normalizedArchiveByExternalId.get(externalId.trim()) ?? null;
}

export function searchNormalizedExploreArchives(
  query: string,
  limit = 40,
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  return filterV18ExploreVisibleArchives(NORMALIZED_ARCHIVES)
    .map((item) => {
      const haystack = buildSearchableText(item);
      const score = normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .reduce((count, token) => (haystack.includes(token) ? count + 1 : count), 0);

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getFeaturedNormalizedExploreArchives(limit = 9) {
  return sortFeatured(filterV18ExploreVisibleArchives(NORMALIZED_ARCHIVES)).slice(0, limit);
}
