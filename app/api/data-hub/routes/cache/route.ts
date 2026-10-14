import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { DataHubNormalizedReadService, stripRawProviderPayload } from "@/src/server/data-hub/normalizedReadService";

const querySchema = z.object({
  originPlaceId: z.string().trim().min(1).optional(),
  destinationPlaceId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).optional(),
  mode: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function createRouteCacheGetHandler(serviceFactory = () => new DataHubNormalizedReadService()) {
  return async function GET(request: Request) {
    try {
      const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
      const routes = await serviceFactory().getRouteCache(query);
      return NextResponse.json(stripRawProviderPayload({ ok: true, routes }));
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "路线缓存查询参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "DATA_HUB_ROUTES_FAILED", message: "路线缓存暂时不可用。" } }, { status: 500 });
    }
  };
}

export const GET = createRouteCacheGetHandler();
