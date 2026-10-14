import { NextResponse } from "next/server";
import { z } from "zod";

import { createAreaDetailService } from "@/src/server/data-hub/areaDetailService";

const routeContextSchema = z.object({ id: z.string().trim().min(1) });

export function createDestinationDetailGetHandler(serviceFactory = createAreaDetailService) {
  return async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
    const parsed = routeContextSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "目的地 id 不完整。" } }, { status: 400 });
    }

    const result = await serviceFactory().getDestinationDetail(parsed.data.id);
    return NextResponse.json({ ok: true, ...result });
  };
}

export const GET = createDestinationDetailGetHandler();
