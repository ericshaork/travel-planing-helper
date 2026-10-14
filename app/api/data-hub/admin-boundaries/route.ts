import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createAdminBoundaryService } from "@/src/server/data-hub/admin/adminBoundaryService";

function parseBboxParam(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parts = value.split(",").map((part) => Number(part.trim()));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = parts;

  if (
    minLng >= maxLng ||
    minLat >= maxLat ||
    minLng < -180 ||
    maxLng > 180 ||
    minLat < -90 ||
    maxLat > 90
  ) {
    return null;
  }

  return [minLng, minLat, maxLng, maxLat] as [number, number, number, number];
}

const adminBoundaryQuerySchema = z.object({
  parentAdcode: z.string().trim().regex(/^\d{6}$/).optional(),
  level: z.enum(["province", "prefecture", "county"]),
  bbox: z.string().optional().transform((value, context) => {
    const bbox = parseBboxParam(value);

    if (bbox === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bbox must be minLng,minLat,maxLng,maxLat",
      });
    }

    return bbox;
  }),
  includeGeometry: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
}).refine((value) => Boolean(value.parentAdcode || value.bbox), {
  message: "parentAdcode or bbox is required",
});

export function createAdminBoundariesGetHandler(serviceFactory = createAdminBoundaryService) {
  return async function GET(request: Request) {
    try {
      const query = adminBoundaryQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams.entries()),
      );
      const result = await serviceFactory().getAdminBoundaries({
        parentAdcode: query.parentAdcode,
        level: query.level,
        bbox: query.bbox ?? undefined,
        includeGeometry: query.includeGeometry,
      });

      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "行政区边界查询参数不完整或格式不正确。",
          },
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: false,
        error: {
          code: "ADMIN_BOUNDARIES_READ_FAILED",
          message: "行政区边界暂时不可用。",
        },
      }, { status: 500 });
    }
  };
}

export const GET = createAdminBoundariesGetHandler();
