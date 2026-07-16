import { NextResponse } from "next/server";
import { z } from "zod";

import { tripPlanSchema, tripRequestSchema } from "../../../../lib/trip/schema";
import { createSupabaseAccessTokenClient } from "../../../../lib/supabase/server";
import { buildSavedTripMutation } from "../../../../lib/trips/save-payload";
import type {
  DeleteTripResponse,
  LoadTripResponse,
  SaveTripRequestPayload,
  UpdateTripResponse,
} from "../../../../lib/trips/types";
import { AppError } from "../../../../lib/utils/errors";

const updateTripBodySchema = z.object({
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

const metadataPatchBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["draft", "saved", "archived"]).optional(),
    source_type: z.enum(["ai_generated", "blank_manual", "explore_import"]).optional(),
    trip_preferences_json: z.record(z.string(), z.unknown()).optional(),
    local_draft_id: z.string().trim().min(1).max(120).nullable().optional(),
    last_opened_at: z.string().datetime().nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "至少提交一个可更新字段。",
  });

const tripDetailSelectFields =
  "id,title,destination_city,start_date,end_date,days,budget,trip_request_json,trip_plan_json,enrichment_json,weather_summary_json,cover_image_url,source_type,status,trip_preferences_json,local_draft_id,last_opened_at,created_at,updated_at";

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

function buildLoadErrorResponse(
  code: "UNAUTHORIZED" | "TRIP_NOT_FOUND" | "LOAD_TRIP_FAILED",
  message: string,
) {
  return {
    ok: false,
    code,
    message,
  } satisfies LoadTripResponse;
}

function buildUpdateErrorResponse(
  code: "UNAUTHORIZED" | "TRIP_NOT_FOUND" | "UPDATE_TRIP_FAILED",
  message: string,
) {
  return {
    ok: false,
    code,
    message,
  };
}

function buildDeleteErrorResponse(
  code: "UNAUTHORIZED" | "TRIP_NOT_FOUND" | "DELETE_TRIP_FAILED",
  message: string,
) {
  return {
    ok: false,
    code,
    message,
  };
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

function normalizeTripId(tripId: string) {
  return tripId.trim();
}

function toSavedTripPayload(
  body: z.infer<typeof updateTripBodySchema>,
): SaveTripRequestPayload {
  return {
    tripRequest: body.tripRequest,
    tripPlan: body.tripPlan,
    tripEnrichment:
      body.tripEnrichment &&
      typeof body.tripEnrichment === "object" &&
      "enrichment" in body.tripEnrichment &&
      "weatherSummary" in body.tripEnrichment
        ? (body.tripEnrichment as SaveTripRequestPayload["tripEnrichment"])
        : null,
    saveMetadata: body.saveMetadata,
  };
}

function isFullTripUpdateBody(
  body: unknown,
): body is z.infer<typeof updateTripBodySchema> {
  return updateTripBodySchema.safeParse(body).success;
}

export function createTripDetailGetHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ tripId: string }> },
  ) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        return NextResponse.json(
          buildLoadErrorResponse("UNAUTHORIZED", "请先登录，再打开这条历史行程。"),
          { status: 401 },
        );
      }

      const { tripId } = await context.params;
      const normalizedTripId = normalizeTripId(tripId);

      if (!normalizedTripId) {
        return NextResponse.json(
          buildLoadErrorResponse(
            "TRIP_NOT_FOUND",
            "这条行程不存在，或你暂时没有权限打开它。",
          ),
          { status: 404 },
        );
      }

      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const { data, error } = await client
        .from("trip_plans")
        .select(tripDetailSelectFields)
        .eq("id", normalizedTripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          buildLoadErrorResponse(
            "LOAD_TRIP_FAILED",
            "暂时打不开这条历史行程，请稍后再试。",
          ),
          { status: 500 },
        );
      }

      if (!data) {
        return NextResponse.json(
          buildLoadErrorResponse(
            "TRIP_NOT_FOUND",
            "这条行程不存在，或你暂时没有权限打开它。",
          ),
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        trip: data,
      } satisfies LoadTripResponse);
    } catch (error) {
      if (error instanceof AppError && error.code === "UNAUTHORIZED") {
        return NextResponse.json(
          buildLoadErrorResponse("UNAUTHORIZED", "请先登录，再打开这条历史行程。"),
          { status: 401 },
        );
      }

      return NextResponse.json(
        buildLoadErrorResponse(
          "LOAD_TRIP_FAILED",
          "暂时打不开这条历史行程，请稍后再试。",
        ),
        { status: 500 },
      );
    }
  };
}

export function createTripDetailPatchHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ tripId: string }> },
  ) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        return NextResponse.json(
          buildUpdateErrorResponse(
            "UNAUTHORIZED",
            "请先登录，再更新这条已保存计划。",
          ),
          { status: 401 },
        );
      }

      const body = await request.json();
      const { tripId } = await context.params;
      const normalizedTripId = normalizeTripId(tripId);

      if (!normalizedTripId) {
        return NextResponse.json(
          buildUpdateErrorResponse(
            "TRIP_NOT_FOUND",
            "这条已保存计划不存在，或你暂时没有权限更新它。",
          ),
          { status: 404 },
        );
      }

      if (isFullTripUpdateBody(body)) {
        const { client, user } = await resolveAuthenticatedUser(
          accessToken,
          createClient,
        );
        const updatePayload = buildSavedTripMutation(toSavedTripPayload(body));
        const { data, error } = await client
          .from("trip_plans")
          .update(updatePayload)
          .eq("id", normalizedTripId)
          .eq("user_id", user.id)
          .select("id,updated_at")
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            buildUpdateErrorResponse(
              "UPDATE_TRIP_FAILED",
              "暂时更新不了这条已保存计划，请稍后再试。",
            ),
            { status: 500 },
          );
        }

        if (!data?.id || !data.updated_at) {
          return NextResponse.json(
            buildUpdateErrorResponse(
              "TRIP_NOT_FOUND",
              "这条已保存计划不存在，或你暂时没有权限更新它。",
            ),
            { status: 404 },
          );
        }

        return NextResponse.json({
          ok: true,
          tripId: data.id,
          updatedAt: data.updated_at,
        } satisfies UpdateTripResponse);
      }

      const metadataPatch = metadataPatchBodySchema.parse(body);
      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const { data, error } = await client
        .from("trip_plans")
        .update(metadataPatch)
        .eq("id", normalizedTripId)
        .eq("user_id", user.id)
        .select(tripDetailSelectFields)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          buildUpdateErrorResponse(
            "UPDATE_TRIP_FAILED",
            "暂时更新不了这条已保存计划，请稍后再试。",
          ),
          { status: 500 },
        );
      }

      if (!data) {
        return NextResponse.json(
          buildUpdateErrorResponse(
            "TRIP_NOT_FOUND",
            "这条已保存计划不存在，或你暂时没有权限更新它。",
          ),
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        trip: data,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          buildUpdateErrorResponse(
            "UPDATE_TRIP_FAILED",
            "当前方案内容不完整，暂时还不能更新这条已保存计划。",
          ),
          { status: 400 },
        );
      }

      if (error instanceof AppError && error.code === "UNAUTHORIZED") {
        return NextResponse.json(
          buildUpdateErrorResponse(
            "UNAUTHORIZED",
            "请先登录，再更新这条已保存计划。",
          ),
          { status: 401 },
        );
      }

      return NextResponse.json(
        buildUpdateErrorResponse(
          "UPDATE_TRIP_FAILED",
          "暂时更新不了这条已保存计划，请稍后再试。",
        ),
        { status: 500 },
      );
    }
  };
}

export function createTripDetailDeleteHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function DELETE(
    request: Request,
    context: { params: Promise<{ tripId: string }> },
  ) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        return NextResponse.json(
          buildDeleteErrorResponse(
            "UNAUTHORIZED",
            "请先登录，再删除这条已保存计划。",
          ),
          { status: 401 },
        );
      }

      const { tripId } = await context.params;
      const normalizedTripId = normalizeTripId(tripId);

      if (!normalizedTripId) {
        return NextResponse.json(
          buildDeleteErrorResponse(
            "TRIP_NOT_FOUND",
            "这条已保存计划不存在，或你暂时没有权限删除它。",
          ),
          { status: 404 },
        );
      }

      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const { data, error } = await client
        .from("trip_plans")
        .delete()
        .eq("id", normalizedTripId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          buildDeleteErrorResponse(
            "DELETE_TRIP_FAILED",
            "暂时删不掉这条已保存计划，请稍后再试。",
          ),
          { status: 500 },
        );
      }

      if (!data?.id) {
        return NextResponse.json(
          buildDeleteErrorResponse(
            "TRIP_NOT_FOUND",
            "这条已保存计划不存在，或你暂时没有权限删除它。",
          ),
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
      } satisfies DeleteTripResponse);
    } catch (error) {
      if (error instanceof AppError && error.code === "UNAUTHORIZED") {
        return NextResponse.json(
          buildDeleteErrorResponse(
            "UNAUTHORIZED",
            "请先登录，再删除这条已保存计划。",
          ),
          { status: 401 },
        );
      }

      return NextResponse.json(
        buildDeleteErrorResponse(
          "DELETE_TRIP_FAILED",
          "暂时删不掉这条已保存计划，请稍后再试。",
        ),
        { status: 500 },
      );
    }
  };
}

export const GET = createTripDetailGetHandler();
export const PATCH = createTripDetailPatchHandler();
export const DELETE = createTripDetailDeleteHandler();
