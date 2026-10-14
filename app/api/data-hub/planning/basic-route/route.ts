import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { buildBasicRouteDraft } from "@/src/server/planning/basicRoutePlanner";

const basicRouteBodySchema = z.object({
  destinationId: z.string().trim().min(1).nullable().optional(),
  dayCount: z.number().int().min(1).max(14),
  candidatePlaceIds: z.array(z.string().trim().min(1)).max(80),
  pace: z.enum(["relaxed", "balanced", "intense"]).default("balanced"),
  startPlaceId: z.string().trim().min(1).nullable().optional(),
  endPlaceId: z.string().trim().min(1).nullable().optional(),
  transportMode: z.enum(["walking", "driving", "transit", "cycling", "taxi", "mixed"]).default("walking"),
  userPreferences: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
});

export function createBasicRoutePlanningPostHandler(planner = buildBasicRouteDraft) {
  return async function POST(request: Request) {
    try {
      const body = basicRouteBodySchema.parse(await request.json());
      const draft = await planner(body);
      return NextResponse.json({ ok: true, draft });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_INPUT",
              message: "基础路线规划参数不完整。",
            },
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BASIC_ROUTE_PLANNING_FAILED",
            message: "基础路线规划暂时不可用。",
          },
        },
        { status: 500 },
      );
    }
  };
}

export const POST = createBasicRoutePlanningPostHandler();
