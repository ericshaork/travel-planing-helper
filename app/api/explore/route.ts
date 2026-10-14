import { NextResponse } from "next/server";

import {
  getFeaturedNormalizedExploreArchives,
  getNormalizedExploreArchives,
  mapNormalizedArchiveToExploreContent,
  searchNormalizedExploreArchives,
} from "../../../lib/explore/normalized-source";
import { createExploreRepository } from "../../../lib/explore/repository";
import { getMockExploreList } from "../../../lib/explore/mock-archives";
import {
  getExploreCityKey,
  normalizeExploreListItemDisplay,
} from "../../../lib/explore/display-city";
import { getTripPackageExploreContents } from "../../../lib/trip-packages/source";
import type {
  ExploreListResponse,
  ExploreTripContent,
  ExploreTripListFilters,
  ExploreTripListItem,
} from "../../../lib/explore/types";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

function normalizeFilters(searchParams: URLSearchParams): ExploreTripListFilters {
  const search = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const tripType = searchParams.get("trip_type")?.trim();
  const daysParam = searchParams.get("days")?.trim();
  const tagsParam = searchParams.get("tags")?.trim();
  const featuredParam = searchParams.get("featured")?.trim();
  const terrainParam = searchParams.get("terrain")?.trim();
  const cuisineParam = searchParams.get("cuisine")?.trim();
  const seasonParam = searchParams.get("season")?.trim();
  const companionParam = searchParams.get("companion")?.trim();
  const limitParam = searchParams.get("limit")?.trim();
  const days =
    daysParam && Number.isFinite(Number(daysParam)) ? Number(daysParam) : undefined;
  const limit =
    limitParam && Number.isFinite(Number(limitParam))
      ? Number(limitParam)
      : undefined;
  const featured =
    featuredParam === "true" ? true : featuredParam === "false" ? false : undefined;
  const tags = tagsParam
    ? tagsParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  const terrain = terrainParam
    ? terrainParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  const cuisine = cuisineParam
    ? cuisineParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  const season = seasonParam
    ? seasonParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  const companion = companionParam
    ? companionParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;

  return {
    ...(search ? { search } : {}),
    ...(city ? { city } : {}),
    ...(tripType ? { tripType } : {}),
    ...(typeof days === "number" && Number.isInteger(days) && days > 0
      ? { days }
      : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(typeof featured === "boolean" ? { featured } : {}),
    ...(terrain && terrain.length > 0 ? { terrain } : {}),
    ...(cuisine && cuisine.length > 0 ? { cuisine } : {}),
    ...(season && season.length > 0 ? { season } : {}),
    ...(companion && companion.length > 0 ? { companion } : {}),
    ...(typeof limit === "number" && Number.isInteger(limit) && limit > 0
      ? { limit }
      : {}),
  };
}

function toListItem(item: ExploreTripContent): ExploreTripListItem {
  return normalizeExploreListItemDisplay({
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
  });
}

function mergeExploreContents(items: ExploreTripContent[]) {
  const seen = new Set<string>();
  const packageCityKeys = new Set(
    items
      .filter((item) => item.source.batchId === "trip-package-v1.9")
      .map((item) => getExploreCityKey(item.city, item.cityCode))
      .filter(Boolean),
  );
  const merged: ExploreTripContent[] = [];

  for (const item of items) {
    const keys = [item.id, item.externalId, item.slug].filter(Boolean);
    const cityKey = getExploreCityKey(item.city, item.cityCode);
    const isTripPackage = item.source.batchId === "trip-package-v1.9";
    const isOlderNormalizedFallback = item.source.batchId === "normalized-v1";

    if (isOlderNormalizedFallback && !isTripPackage && packageCityKeys.has(cityKey)) {
      continue;
    }

    if (keys.some((key) => seen.has(key))) {
      continue;
    }

    keys.forEach((key) => seen.add(key));
    merged.push(item);
  }

  return merged;
}

export function createExploreListHandler(
  repository?: ReturnType<typeof createExploreRepository>,
) {
  return async function GET(request: Request) {
    try {
      const filters = normalizeFilters(new URL(request.url).searchParams);
      const packageResult = await getTripPackageExploreContents(filters);
      const normalizedItems = filters.search
        ? searchNormalizedExploreArchives(filters.search, filters.limit ?? 40)
        : filters.featured
          ? getFeaturedNormalizedExploreArchives(filters.limit ?? 9)
          : getNormalizedExploreArchives({
              ...filters,
              limit: filters.limit ?? 40,
            });
      const staticItems = mergeExploreContents([
        ...packageResult.items,
        ...normalizedItems.map((item) => mapNormalizedArchiveToExploreContent(item)),
      ]);
      let repositoryItems: ExploreTripContent[] = [];

      try {
        const resolvedRepository = repository ?? createExploreRepository();
        repositoryItems = await resolvedRepository.listPublished(filters);
      } catch (error) {
        if (staticItems.length === 0) {
          throw error;
        }
      }

      const items = mergeExploreContents([...repositoryItems, ...staticItems]);

      if (items.length > 0) {
        return NextResponse.json({
          ok: true,
          items: items.slice(0, filters.limit).map(toListItem),
        } satisfies ExploreListResponse);
      }

      return NextResponse.json({
        ok: true,
        items: getMockExploreList().map(normalizeExploreListItemDisplay),
      } satisfies ExploreListResponse);
    } catch (error) {
      const fallbackItems = getMockExploreList().map(normalizeExploreListItemDisplay);

      if (fallbackItems.length > 0) {
        return NextResponse.json({
          ok: true,
          items: fallbackItems,
        } satisfies ExploreListResponse);
      }

      if (error instanceof AppError) {
        return NextResponse.json(toApiErrorResponse(error), {
          status: 500,
        });
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: 500,
      });
    }
  };
}

export const GET = createExploreListHandler();
