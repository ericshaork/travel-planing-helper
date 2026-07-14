import { createSupabaseServiceRoleClient } from "../supabase/server.ts";
import type { ExploreTripContentRow } from "../supabase/types.ts";
import { AppError } from "../utils/errors.ts";

import {
  buildExploreTripInsertRow,
  mapExploreTripContentRow,
} from "./rows.ts";
import type { ExploreTripContentInsert, ExploreTripListFilters } from "./types.ts";

const EXPLORE_TABLE = "explore_trip_contents";
const EXPLORE_SELECT_FIELDS = [
  "id",
  "external_id",
  "slug",
  "title",
  "summary",
  "city",
  "city_code",
  "region",
  "trip_type",
  "theme",
  "days",
  "tags",
  "pace",
  "budget_level",
  "budget_note",
  "status",
  "review_status",
  "image_prompt",
  "cover_image_url",
  "source_pipeline",
  "source_batch_id",
  "source_content_key",
  "source_file_path",
  "highlights_json",
  "itinerary_days_json",
  "poi_highlights_json",
  "food_highlights_json",
  "raw_content_json",
  "published_at",
  "created_at",
  "updated_at",
].join(",");

export { buildExploreTripInsertRow, mapExploreTripContentRow } from "./rows.ts";
export { buildExploreTripUpdateRow } from "./rows.ts";

function createExploreLoadError(details?: unknown) {
  return new AppError(
    "UNKNOWN_ERROR",
    "暂时拿不到这条 Explore 内容，请稍后再试。",
    details,
  );
}

export function createExploreRepository(
  client = createSupabaseServiceRoleClient(),
) {
  return {
    async listPublished(filters: ExploreTripListFilters = {}) {
      let query = client
        .from(EXPLORE_TABLE)
        .select(EXPLORE_SELECT_FIELDS)
        .eq("status", filters.status ?? "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });

      if (filters.city) {
        query = query.eq("city_code", filters.city);
      }

      if (filters.tripType) {
        query = query.eq("trip_type", filters.tripType);
      }

      if (typeof filters.days === "number") {
        query = query.eq("days", filters.days);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      if (typeof filters.limit === "number") {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(
          "UNKNOWN_ERROR",
          "暂时拿不到 Explore 内容列表，请稍后再试。",
          error,
        );
      }

      return (data ?? []).map((row) =>
        mapExploreTripContentRow(row as unknown as ExploreTripContentRow),
      );
    },

    async getById(id: string) {
      const { data, error } = await client
        .from(EXPLORE_TABLE)
        .select(EXPLORE_SELECT_FIELDS)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw createExploreLoadError(error);
      }

      return data
        ? mapExploreTripContentRow(data as unknown as ExploreTripContentRow)
        : null;
    },

    async getBySlug(slug: string) {
      const { data, error } = await client
        .from(EXPLORE_TABLE)
        .select(EXPLORE_SELECT_FIELDS)
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw createExploreLoadError(error);
      }

      return data
        ? mapExploreTripContentRow(data as unknown as ExploreTripContentRow)
        : null;
    },

    async getByExternalId(externalId: string) {
      const { data, error } = await client
        .from(EXPLORE_TABLE)
        .select(EXPLORE_SELECT_FIELDS)
        .eq("external_id", externalId)
        .maybeSingle();

      if (error) {
        throw createExploreLoadError(error);
      }

      return data
        ? mapExploreTripContentRow(data as unknown as ExploreTripContentRow)
        : null;
    },

    async upsertImportedContent(input: ExploreTripContentInsert) {
      const row = buildExploreTripInsertRow(input);
      const { data, error } = await client
        .from(EXPLORE_TABLE)
        .upsert(row, {
          onConflict: "external_id",
        })
        .select(EXPLORE_SELECT_FIELDS)
        .single();

      if (error || !data) {
        throw new AppError(
          "UNKNOWN_ERROR",
          "Explore 内容导入失败，请检查 schema 或数据库写入状态。",
          error,
        );
      }

      return mapExploreTripContentRow(data as unknown as ExploreTripContentRow);
    },
  };
}
