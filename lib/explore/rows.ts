import type {
  ExploreTripContentInsert as ExploreTripContentInsertRow,
  ExploreTripContentRow,
  ExploreTripContentUpdate as ExploreTripContentUpdateRow,
} from "../supabase/types.ts";

import {
  exploreTripContentInsertSchema,
  exploreTripContentSchema,
  exploreTripContentUpdateSchema,
} from "./schema.ts";
import type {
  ExploreTripContent,
  ExploreTripContentInsert,
  ExploreTripContentUpdate,
} from "./types.ts";

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function mapExploreTripContentRow(
  row: ExploreTripContentRow,
): ExploreTripContent {
  return exploreTripContentSchema.parse({
    id: row.id,
    externalId: row.external_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    city: row.city,
    cityCode: row.city_code,
    region: row.region ?? undefined,
    tripType: row.trip_type,
    days: row.days,
    tags: normalizeStringList(row.tags),
    theme: row.theme ?? undefined,
    pace: row.pace ?? undefined,
    budgetLevel: row.budget_level ?? undefined,
    budgetNote: row.budget_note ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    imagePrompt: row.image_prompt ?? undefined,
    archiveIntro: undefined,
    featured: undefined,
    featuredReason: undefined,
    creatorType: undefined,
    creatorId: undefined,
    creator: undefined,
    likes: undefined,
    views: undefined,
    savedCount: undefined,
    terrainTags: undefined,
    cuisineTags: undefined,
    seasonTags: undefined,
    companionTags: undefined,
    highlights: normalizeStringList(row.highlights_json),
    dailyItinerary: Array.isArray(row.itinerary_days_json)
      ? row.itinerary_days_json
      : [],
    pois: Array.isArray(row.poi_highlights_json) ? row.poi_highlights_json : [],
    food: Array.isArray(row.food_highlights_json)
      ? row.food_highlights_json
      : [],
    status: row.status,
    reviewStatus: row.review_status,
    source: {
      pipeline: "travel-content-pipeline",
      batchId: row.source_batch_id ?? undefined,
      sourceContentKey: row.source_content_key ?? undefined,
      sourceFilePath: row.source_file_path ?? undefined,
    },
    rawContent: row.raw_content_json,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function buildExploreTripInsertRow(
  input: ExploreTripContentInsert,
): ExploreTripContentInsertRow {
  const content = exploreTripContentInsertSchema.parse(input);

  return {
    external_id: content.externalId,
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    city: content.city,
    city_code: content.cityCode,
    region: content.region ?? null,
    trip_type: content.tripType,
    theme: content.theme ?? null,
    days: content.days,
    tags: content.tags,
    pace: content.pace ?? null,
    budget_level: content.budgetLevel ?? null,
    budget_note: content.budgetNote ?? null,
    status: content.status ?? "draft",
    review_status: content.reviewStatus ?? "pending",
    image_prompt: content.imagePrompt ?? null,
    cover_image_url: content.coverImageUrl ?? null,
    source_pipeline: content.source.pipeline,
    source_batch_id: content.source.batchId ?? null,
    source_content_key: content.source.sourceContentKey ?? null,
    source_file_path: content.source.sourceFilePath ?? null,
    highlights_json: content.highlights,
    itinerary_days_json: content.dailyItinerary,
    poi_highlights_json: content.pois,
    food_highlights_json: content.food,
    raw_content_json: content.rawContent,
    published_at: content.publishedAt ?? null,
  };
}

export function buildExploreTripUpdateRow(
  input: ExploreTripContentUpdate,
): ExploreTripContentUpdateRow {
  const content = exploreTripContentUpdateSchema.parse(input);

  return {
    ...(content.title === undefined ? {} : { title: content.title }),
    ...(content.summary === undefined ? {} : { summary: content.summary }),
    ...(content.city === undefined ? {} : { city: content.city }),
    ...(content.cityCode === undefined ? {} : { city_code: content.cityCode }),
    ...(content.region === undefined ? {} : { region: content.region ?? null }),
    ...(content.tripType === undefined ? {} : { trip_type: content.tripType }),
    ...(content.days === undefined ? {} : { days: content.days }),
    ...(content.tags === undefined ? {} : { tags: content.tags }),
    ...(content.theme === undefined ? {} : { theme: content.theme ?? null }),
    ...(content.pace === undefined ? {} : { pace: content.pace ?? null }),
    ...(content.budgetLevel === undefined
      ? {}
      : { budget_level: content.budgetLevel ?? null }),
    ...(content.budgetNote === undefined
      ? {}
      : { budget_note: content.budgetNote ?? null }),
    ...(content.coverImageUrl === undefined
      ? {}
      : { cover_image_url: content.coverImageUrl ?? null }),
    ...(content.imagePrompt === undefined
      ? {}
      : { image_prompt: content.imagePrompt ?? null }),
    ...(content.highlights === undefined
      ? {}
      : { highlights_json: content.highlights }),
    ...(content.dailyItinerary === undefined
      ? {}
      : { itinerary_days_json: content.dailyItinerary }),
    ...(content.pois === undefined
      ? {}
      : { poi_highlights_json: content.pois }),
    ...(content.food === undefined
      ? {}
      : { food_highlights_json: content.food }),
    ...(content.status === undefined ? {} : { status: content.status }),
    ...(content.reviewStatus === undefined
      ? {}
      : { review_status: content.reviewStatus }),
    ...(content.source === undefined
      ? {}
      : {
          source_pipeline: content.source.pipeline,
          source_batch_id: content.source.batchId ?? null,
          source_content_key: content.source.sourceContentKey ?? null,
          source_file_path: content.source.sourceFilePath ?? null,
        }),
    ...(content.rawContent === undefined
      ? {}
      : { raw_content_json: content.rawContent }),
    ...(content.publishedAt === undefined
      ? {}
      : { published_at: content.publishedAt }),
  };
}
