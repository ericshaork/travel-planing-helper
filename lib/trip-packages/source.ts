import type {
  ExploreTripContent,
  ExploreTripListFilters,
  ExploreTripListItem,
} from "../explore/types";
import { adaptTripPackagesToExploreContents } from "./adapter";
import { loadAvailableTripPackages } from "./loader";
import type {
  LoadedTripPackage,
  TripPackageExploreSourceResult,
  TripPackageLoadIssue,
} from "./types";

function normalizeSearchText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesAny(values: Array<string | undefined>, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return values
    .map(normalizeSearchText)
    .filter(Boolean)
    .some((value) => value === normalizedQuery || value.includes(normalizedQuery));
}

function arrayIntersects(values: string[] | undefined, filters: string[] | undefined) {
  if (!filters || filters.length === 0) {
    return true;
  }

  const valueSet = new Set((values ?? []).map(normalizeSearchText));
  return filters.some((filter) => valueSet.has(normalizeSearchText(filter)));
}

function matchesFilters(item: ExploreTripContent, filters: ExploreTripListFilters) {
  if (
    filters.search &&
    !matchesAny(
      [
        item.title,
        item.summary,
        item.city,
        item.cityCode,
        item.slug,
        item.externalId,
        item.theme,
        item.tripType,
        ...item.tags,
        ...item.highlights,
      ],
      filters.search,
    )
  ) {
    return false;
  }

  if (filters.city && !matchesAny([item.city, item.cityCode], filters.city)) {
    return false;
  }

  if (filters.tripType && item.tripType !== filters.tripType) {
    return false;
  }

  if (typeof filters.days === "number" && item.days !== filters.days) {
    return false;
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagSet = new Set(item.tags.map(normalizeSearchText));
    if (!filters.tags.every((tag) => tagSet.has(normalizeSearchText(tag)))) {
      return false;
    }
  }

  if (typeof filters.featured === "boolean" && Boolean(item.featured) !== filters.featured) {
    return false;
  }

  if (!arrayIntersects(item.terrainTags, filters.terrain)) {
    return false;
  }

  if (!arrayIntersects(item.cuisineTags, filters.cuisine)) {
    return false;
  }

  if (!arrayIntersects(item.seasonTags, filters.season)) {
    return false;
  }

  if (!arrayIntersects(item.companionTags, filters.companion)) {
    return false;
  }

  return true;
}

export function toTripPackageExploreListItem(
  item: ExploreTripContent,
): ExploreTripListItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    city: item.city,
    cityCode: item.cityCode,
    region: item.region,
    tripType: item.tripType,
    days: item.days,
    tags: item.tags,
    theme: item.theme,
    pace: item.pace,
    coverImageUrl: item.coverImageUrl,
    archiveIntro: item.archiveIntro,
    featured: item.featured,
    featuredReason: item.featuredReason,
    creatorType: item.creatorType,
    creatorId: item.creatorId,
    creator: item.creator,
    likes: item.likes,
    views: item.views,
    savedCount: item.savedCount,
    terrainTags: item.terrainTags,
    cuisineTags: item.cuisineTags,
    seasonTags: item.seasonTags,
    companionTags: item.companionTags,
    highlights: item.highlights,
  };
}

export async function getTripPackageExploreContents(
  filters: ExploreTripListFilters = {},
): Promise<TripPackageExploreSourceResult> {
  const result = await loadAvailableTripPackages();
  const adapterResult = adaptPackagesSafely(result.packages);
  const filteredItems = adapterResult.items.filter((item) =>
    matchesFilters(item, filters),
  );
  const items =
    typeof filters.limit === "number"
      ? filteredItems.slice(0, filters.limit)
      : filteredItems;

  return {
    items,
    issues: [...result.issues, ...adapterResult.issues],
  };
}

export async function getTripPackageExploreContentById(identifier: string) {
  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier) {
    return {
      item: null,
      issues: [],
    };
  }

  const result = await getTripPackageExploreContents();

  return {
    item:
      result.items.find(
        (item) =>
          item.id === normalizedIdentifier ||
          item.externalId === normalizedIdentifier ||
          item.slug === normalizedIdentifier,
      ) ?? null,
    issues: result.issues,
  };
}

function adaptPackagesSafely(packages: LoadedTripPackage[]) {
  const items: ExploreTripContent[] = [];
  const issues: TripPackageLoadIssue[] = [];

  for (const tripPackage of packages) {
    try {
      items.push(...adaptTripPackagesToExploreContents([tripPackage]));
    } catch (error) {
      issues.push({
        packageId: tripPackage.packageId,
        message:
          error instanceof Error
            ? error.message
            : `Trip Package ${tripPackage.packageId} 转换 Explore 内容失败。`,
        cause: error,
      });
    }
  }

  return {
    items,
    issues,
  };
}
