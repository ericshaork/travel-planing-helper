import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createAreaDetailService } from "@/src/server/data-hub/areaDetailService";

const baseSchema = z.object({
  targetType: z.enum(["destination", "admin_area", "travel_region"]),
  name: z.string().trim().min(1).max(160),
  sourceProvider: z.string().trim().max(80).nullable().optional(),
  sourceExternalId: z.string().trim().max(160).nullable().optional(),
});

const destinationSchema = baseSchema.extend({
  targetType: z.literal("destination"),
  destinationId: z.string().trim().min(1).nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  travelSummary: z.string().trim().nullable().optional(),
  bestSeason: z.string().trim().nullable().optional(),
  primaryThemes: z.array(z.string().trim().min(1).max(80)).optional(),
});

const adminAreaSchema = baseSchema.extend({
  targetType: z.literal("admin_area"),
  adminAreaId: z.string().trim().min(1).nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  travelSummary: z.string().trim().nullable().optional(),
  transportSummary: z.string().trim().nullable().optional(),
  suitableFor: z.array(z.string().trim().min(1).max(80)).optional(),
});

const travelRegionSchema = baseSchema.extend({
  targetType: z.literal("travel_region"),
  travelRegionId: z.string().trim().min(1).nullable().optional(),
  intro: z.string().trim().nullable().optional(),
  playStyle: z.string().trim().nullable().optional(),
  suggestedRoute: z.string().trim().nullable().optional(),
  suitableFor: z.array(z.string().trim().min(1).max(80)).optional(),
  crowdLevel: z.string().trim().nullable().optional(),
  representativePlaceIds: z.array(z.string().trim().min(1).max(120)).optional(),
});

const enrichBodySchema = z.discriminatedUnion("targetType", [
  destinationSchema,
  adminAreaSchema,
  travelRegionSchema,
]);

export function createAreaDetailEnrichPostHandler(serviceFactory = createAreaDetailService) {
  return async function POST(request: Request) {
    try {
      const body = enrichBodySchema.parse(await request.json());
      const result = await serviceFactory().enrichAreaDetail(body as Parameters<ReturnType<typeof serviceFactory>["enrichAreaDetail"]>[0]);
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "区域详情补全参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "AREA_DETAIL_ENRICH_FAILED", message: "区域详情补全暂时不可用。" } }, { status: 500 });
    }
  };
}

export const POST = createAreaDetailEnrichPostHandler();

