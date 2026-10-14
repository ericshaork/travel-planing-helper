import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { DataHubNormalizedReadService, stripRawProviderPayload } from "@/src/server/data-hub/normalizedReadService";

const paramsSchema = z.object({
  id: z.string().trim().min(1),
});

const querySchema = z.object({
  provider: z.string().trim().min(1).optional(),
  factType: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function createPlaceFactsGetHandler(serviceFactory = () => new DataHubNormalizedReadService()) {
  return async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const params = paramsSchema.parse(await context.params);
      const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
      const facts = await serviceFactory().getPlaceFacts({
        placeId: params.id,
        provider: query.provider,
        factType: query.factType,
        limit: query.limit,
      });
      return NextResponse.json(stripRawProviderPayload({ ok: true, facts }));
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "地点事实查询参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "DATA_HUB_FACTS_FAILED", message: "地点事实暂时不可用。" } }, { status: 500 });
    }
  };
}

export const GET = createPlaceFactsGetHandler();
