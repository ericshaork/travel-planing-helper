import { NextResponse } from "next/server";
import { z } from "zod";

import { tripPlanSchema, tripRequestSchema } from "../../../lib/trip/schema";
import { createSupabaseAccessTokenClient } from "../../../lib/supabase/server";
import { buildSavedTripInsert } from "../../../lib/trips/save-payload";
import type {
  ListTripsResponse,
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
});

const listTripsSelectFields =
  "id,title,destination_city,start_date,end_date,days,budget,cover_image_url,created_at,updated_at";

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
      const { data, error } = await client
        .from("trip_plans")
        .select(listTripsSelectFields)
        .eq("user_id", user.id)
        .order("updated_at", {
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

      return NextResponse.json({
        ok: true,
        trips: data ?? [],
      } satisfies ListTripsResponse);
    } catch (error) {
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
