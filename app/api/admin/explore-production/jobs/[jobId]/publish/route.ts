import { NextResponse } from "next/server";

import { publishProductionJob } from "@/lib/admin/explore-production/store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const result = await publishProductionJob(jobId);

    return NextResponse.json({
      ok: true,
      job: result.job,
      publishPayload: result.publishPayload,
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
