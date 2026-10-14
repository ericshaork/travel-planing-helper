import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createDataHubService } from "@/src/server/data-hub/dataHubService";

const enrichBodySchema = z.object({
  placeId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().trim().max(240).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  destinationId: z.string().trim().min(1).nullable().optional(),
  regionId: z.string().trim().min(1).nullable().optional(),
  sourceProvider: z.string().trim().max(80).nullable().optional(),
  sourceExternalId: z.string().trim().max(160).nullable().optional(),
});

export function createDataHubPlaceEnrichPostHandler(serviceFactory = createDataHubService) {
  return async function POST(request: Request) {
    try {
      const body = enrichBodySchema.parse(await request.json());
      const result = await serviceFactory().enrichPlace(body);
      return NextResponse.json({ ok: result.detail !== null, ...result }, { status: result.detail ? 200 : 404 });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "地点补全参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "DATA_HUB_ENRICH_FAILED", message: "地点补全暂时不可用。" } }, { status: 500 });
    }
  };
}

export const POST = createDataHubPlaceEnrichPostHandler();
