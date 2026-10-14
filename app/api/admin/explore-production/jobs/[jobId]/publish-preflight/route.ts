import { NextResponse } from "next/server";

import { buildProductionPublishPreflight } from "@/lib/admin/explore-production/store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const preflight = await buildProductionPublishPreflight(jobId);

    return NextResponse.json({
      ok: true,
      preflight,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
