import { NextResponse } from "next/server";
import { z } from "zod";

import { createProjectTripsRepository } from "../../../lib/projects/trips/repository";
import { createProjectTripsService } from "../../../lib/projects/trips/service";
import { tripPlanSchema, tripRequestSchema } from "../../../lib/trip/schema";
import { createSupabaseAccessTokenClient } from "../../../lib/supabase/server";
import { buildSavedTripInsert } from "../../../lib/trips/save-payload";
import type {
  ListTripsResponse,
  SavedTripListItem,
  SaveTripResponse,
} from "../../../lib/trips/types";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

const saveTripBodySchema = z.object({
  tripRequest: tripRequestSchema,
  tripPlan: tripPlanSchema,
  tripEnrichment: z
    .object({
      enrichment: z.unknown(),
      weatherSummary: z.unknown(),
    })
    .optional()
    .nullable(),
  saveMetadata: z
    .object({
      sourceType: z
        .enum(["ai_generated", "blank_manual", "explore_import"])
        .optional(),
      status: z.enum(["saved"]).optional(),
      localDraftId: z.string().trim().min(1).max(120).nullable().optional(),
    })
    .optional(),
});

const listTripsSelectFields =
  "id,title,destination_city,start_date,end_date,days,budget,cover_image_url,source_type,status,trip_preferences_json,local_draft_id,last_opened_at,created_at,updated_at";

const listTripsQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["draft", "saved", "archived"]).optional(),
  source_type: z
    .enum(["ai_generated", "blank_manual", "explore_import", "file_import"])
    .optional(),
});

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      case "LIST_TRIPS_FAILED":
        return 500;
      default:
        return 500;
    }
  }

  return 500;
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

async function resolveAuthenticatedUser(
  accessToken: string,
  createClient = createSupabaseAccessTokenClient,
) {
  const client = createClient(accessToken);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new AppError("UNAUTHORIZED", "登录状态刚刚失效了，请重新登录后再试。");
  }

  return {
    client,
    user,
  };
}

function listTripsErrorResponse(
  code: "UNAUTHORIZED" | "LIST_TRIPS_FAILED",
  message: string,
) {
  return {
    ok: false,
    code,
    message,
  } satisfies ListTripsResponse;
}

function mapProjectSummaryToSavedTripItem(
  summary: Awaited<
    ReturnType<ReturnType<typeof createProjectTripsService>["listUserProjects"]>
  >[number],
  helpers: {
    mapLifecycleToStatus: ReturnType<typeof createProjectTripsService>["mapLifecycleToStatus"];
    mapProjectSourceType: ReturnType<typeof createProjectTripsService>["mapProjectSourceType"];
  },
): SavedTripListItem {
  return {
    id: `project:${summary.projectId}`,
    entity_type: "project",
    project_id: summary.projectId,
    current_version_id: summary.currentVersionId,
    project_source_type: summary.sourceType,
    project_lifecycle_state: summary.lifecycleState,
    title: summary.title,
    destination_city: summary.destinationCity,
    start_date: summary.startDate,
    end_date: summary.endDate,
    days: summary.days,
    budget: summary.budget,
    cover_image_url: null,
    source_type: helpers.mapProjectSourceType(summary.sourceType),
    status: helpers.mapLifecycleToStatus(summary.lifecycleState),
    trip_preferences_json: {},
    local_draft_id: null,
    last_opened_at: summary.lastActivityAt,
    created_at: summary.createdAt,
    updated_at: summary.updatedAt,
  };
}

function mapLegacyTripToSavedTripItem(row: Record<string, unknown>): SavedTripListItem {
  return {
    id: typeof row.id === "string" ? row.id : String(row.id ?? ""),
    entity_type: "saved_trip",
    project_id: null,
    current_version_id: null,
    project_source_type: null,
    project_lifecycle_state: null,
    title: typeof row.title === "string" ? row.title : "Untitled trip",
    destination_city:
      typeof row.destination_city === "string" ? row.destination_city : null,
    start_date: typeof row.start_date === "string" ? row.start_date : null,
    end_date: typeof row.end_date === "string" ? row.end_date : null,
    days: typeof row.days === "number" ? row.days : null,
    budget: typeof row.budget === "number" ? row.budget : null,
    cover_image_url:
      typeof row.cover_image_url === "string" ? row.cover_image_url : null,
    source_type:
      row.source_type === "ai_generated" ||
      row.source_type === "blank_manual" ||
      row.source_type === "explore_import"
        ? row.source_type
        : "ai_generated",
    status:
      row.status === "draft" || row.status === "saved" || row.status === "archived"
        ? row.status
        : "saved",
    trip_preferences_json:
      row.trip_preferences_json &&
      typeof row.trip_preferences_json === "object" &&
      !Array.isArray(row.trip_preferences_json)
        ? (row.trip_preferences_json as Record<string, unknown>)
        : {},
    local_draft_id:
      typeof row.local_draft_id === "string" ? row.local_draft_id : null,
    last_opened_at:
      typeof row.last_opened_at === "string" ? row.last_opened_at : null,
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(0).toISOString(),
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : new Date(0).toISOString(),
  };
}

function toSortableTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortSavedTripItems(left: SavedTripListItem, right: SavedTripListItem) {
  const lastOpenedDiff =
    toSortableTimestamp(right.last_opened_at) -
    toSortableTimestamp(left.last_opened_at);

  if (lastOpenedDiff !== 0) {
    return lastOpenedDiff;
  }

  const updatedDiff =
    toSortableTimestamp(right.updated_at) - toSortableTimestamp(left.updated_at);

  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  return toSortableTimestamp(right.created_at) - toSortableTimestamp(left.created_at);
}

export function createTripsPostHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function POST(request: Request) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        throw new AppError("UNAUTHORIZED", "请先登录，再把当前方案保存到云端。");
      }

      const body = saveTripBodySchema.parse(await request.json());
      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const insertPayload = buildSavedTripInsert(user.id, {
        tripRequest: body.tripRequest,
        tripPlan: body.tripPlan,
        tripEnrichment:
          body.tripEnrichment &&
          typeof body.tripEnrichment === "object" &&
          "enrichment" in body.tripEnrichment &&
          "weatherSummary" in body.tripEnrichment
            ? (body.tripEnrichment as never)
            : null,
        saveMetadata: body.saveMetadata,
      });
      const { data, error } = await client
        .from("trip_plans")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error || !data?.id) {
        throw new AppError("UNKNOWN_ERROR", "当前方案暂时没保存成功，请稍后再试。");
      }

      return NextResponse.json({
        tripId: data.id,
      } satisfies SaveTripResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError("INVALID_INPUT", "当前方案内容不完整，暂时还不能保存。"),
          ),
          { status: 400 },
        );
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: getErrorStatus(error),
      });
    }
  };
}

export function createTripsGetHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function GET(request: Request) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        return NextResponse.json(
          listTripsErrorResponse("UNAUTHORIZED", "请先登录，再来看你保存过的行程。"),
          { status: 401 },
        );
      }

      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const query = listTripsQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams.entries()),
      );
      const projectTripsService = createProjectTripsService(
        createProjectTripsRepository(client as never),
      );
      const projectTrips = await projectTripsService.listUserProjects(user.id, {
        search: query.search,
        status: query.status ?? "all",
        sourceType: query.source_type ?? "all",
      });
      const mappedProjectTrips = projectTrips.map((summary) =>
        mapProjectSummaryToSavedTripItem(summary, {
          mapLifecycleToStatus: projectTripsService.mapLifecycleToStatus,
          mapProjectSourceType: projectTripsService.mapProjectSourceType,
        }),
      );

      let builder = client
        .from("trip_plans")
        .select(listTripsSelectFields)
        .eq("user_id", user.id);

      if (query.status) {
        builder = builder.eq("status", query.status);
      }

      if (query.source_type && query.source_type !== "file_import") {
        builder = builder.eq("source_type", query.source_type);
      }

      if (query.search) {
        builder = builder.ilike("title", `%${query.search}%`);
      }

      const { data, error } = await builder
        .order("last_opened_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("updated_at", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        return NextResponse.json(
          listTripsErrorResponse(
            "LIST_TRIPS_FAILED",
            "暂时没拉到你的行程列表，请稍后再试。",
          ),
          { status: 500 },
        );
      }

      const legacyTrips =
        query.source_type === "file_import"
          ? []
          : ((data ?? []) as Record<string, unknown>[]).map(
              mapLegacyTripToSavedTripItem,
            );

      return NextResponse.json({
        ok: true,
        trips: [...mappedProjectTrips, ...legacyTrips].sort(sortSavedTripItems),
      } satisfies ListTripsResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          listTripsErrorResponse(
            "LIST_TRIPS_FAILED",
            "行程筛选条件暂时不完整，请调整后再试。",
          ),
          { status: 400 },
        );
      }

      if (error instanceof AppError && error.code === "UNAUTHORIZED") {
        return NextResponse.json(
          listTripsErrorResponse("UNAUTHORIZED", "请先登录，再来看你保存过的行程。"),
          { status: 401 },
        );
      }

      return NextResponse.json(
        listTripsErrorResponse(
          "LIST_TRIPS_FAILED",
          "暂时没拉到你的行程列表，请稍后再试。",
        ),
        { status: getErrorStatus(error) },
      );
    }
  };
}

export const POST = createTripsPostHandler();
export const GET = createTripsGetHandler();
