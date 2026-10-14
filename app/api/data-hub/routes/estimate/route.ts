import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createDataHubService } from "@/src/server/data-hub/dataHubService";

const estimateBodySchema = z.object({
  originPlaceId: z.string().trim().min(1),
  destinationPlaceId: z.string().trim().min(1),
  mode: z.enum(["walking", "driving", "transit", "cycling", "taxi", "mixed"]).default("walking"),
});

export function createDataHubRouteEstimatePostHandler(serviceFactory = createDataHubService) {
  return async function POST(request: Request) {
    try {
      const body = estimateBodySchema.parse(await request.json());
      const result = await serviceFactory().getRouteEstimate(body.originPlaceId, body.destinationPlaceId, body.mode);
      return NextResponse.json({ ok: result.route !== null, ...result }, { status: result.route ? 200 : 422 });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "路线估算参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "DATA_HUB_ROUTE_FAILED", message: "路线估算暂时不可用。" } }, { status: 500 });
    }
  };
}

export const POST = createDataHubRouteEstimatePostHandler();
