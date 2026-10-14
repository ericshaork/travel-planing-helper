import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { DataHubNormalizedReadService, stripRawProviderPayload } from "@/src/server/data-hub/normalizedReadService";

const querySchema = z.object({
  destinationId: z.string().trim().min(1).optional(),
  adminAreaId: z.string().trim().min(1).optional(),
  placeId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).optional(),
  snapshotType: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function createWeatherGetHandler(serviceFactory = () => new DataHubNormalizedReadService()) {
  return async function GET(request: Request) {
    try {
      const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
      const weather = await serviceFactory().getWeather(query);
      return NextResponse.json(stripRawProviderPayload({ ok: true, weather }));
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "天气查询参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "DATA_HUB_WEATHER_FAILED", message: "天气数据暂时不可用。" } }, { status: 500 });
    }
  };
}

export const GET = createWeatherGetHandler();
