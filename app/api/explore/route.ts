import { NextResponse } from "next/server";

import { createExploreRepository } from "../../../lib/explore/repository";
import type {
  ExploreListResponse,
  ExploreTripContent,
  ExploreTripListFilters,
  ExploreTripListItem,
} from "../../../lib/explore/types";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

function normalizeFilters(searchParams: URLSearchParams): ExploreTripListFilters {
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

export function createExploreListHandler(
  repository?: ReturnType<typeof createExploreRepository>,
) {
  return async function GET(request: Request) {
    try {
      const resolvedRepository = repository ?? createExploreRepository();
      const filters = normalizeFilters(new URL(request.url).searchParams);
      const items = await resolvedRepository.listPublished(filters);

      return NextResponse.json({
        ok: true,
        items: items.map(toListItem),
      } satisfies ExploreListResponse);
    } catch (error) {
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
