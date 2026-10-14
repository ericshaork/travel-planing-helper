import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createDataHubService } from "@/src/server/data-hub/dataHubService";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80).optional(),
  countryCode: z.string().trim().min(2).max(3).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

export function createDataHubPlacesSearchGetHandler(serviceFactory = createDataHubService) {
  return async function GET(request: Request) {
    try {
      const query = searchQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
      const result = await serviceFactory().searchPlaces(query.q, {
        city: query.city,
        countryCode: query.countryCode,
        limit: query.limit,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "地点搜索参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "DATA_HUB_SEARCH_FAILED", message: "地点搜索暂时不可用。" } }, { status: 500 });
    }
  };
}

export const GET = createDataHubPlacesSearchGetHandler();
