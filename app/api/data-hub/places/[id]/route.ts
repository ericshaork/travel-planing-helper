import { NextResponse } from "next/server";
import { z } from "zod";

import { createProductDataHubService, stripUnsafeProductData } from "@/src/server/data-hub/productDataHubService";

const routeContextSchema = z.object({
  id: z.string().trim().min(1),
});

export function createDataHubPlaceDetailGetHandler(serviceFactory = createProductDataHubService) {
  return async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const params = await context.params;
      const parsed = routeContextSchema.safeParse(params);
      if (!parsed.success) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "地点 id 不完整。" } }, { status: 400 });
      }

      const profile = await serviceFactory().getPlaceProfile(parsed.data.id);
      if (!profile) {
        return NextResponse.json({
          ok: false,
          detail: null,
          missingFields: [],
          sources: [],
          error: { code: "not_found", message: "Data Hub 中没有找到这个地点。" },
        }, { status: 404 });
      }

      return NextResponse.json(stripUnsafeProductData({
        ok: true,
        detail: profile.detail,
        facts: profile.facts,
        weatherContext: profile.weatherContext,
        routeContext: profile.routeContext,
        sources: profile.sourceSummary,
        missingFields: profile.missingFields,
        error: profile.missingFields.length
          ? { code: "missing_facts", message: "地点资料还有部分字段暂缺。" }
          : undefined,
      }));
    } catch {
      return NextResponse.json({ ok: false, error: { code: "database_error", message: "Data Hub 地点资料暂时不可用。" } }, { status: 500 });
    }
  };
}

export const GET = createDataHubPlaceDetailGetHandler();
