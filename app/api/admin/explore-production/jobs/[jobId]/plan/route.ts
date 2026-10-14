import { NextResponse } from "next/server";

import {
  readProductionPlan,
  updateProductionPlan,
} from "@/lib/admin/explore-production/store";
import type { PipelineExplorePlan } from "@/lib/admin/explore-production/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const plan = await readProductionPlan(jobId);

    return NextResponse.json({
      ok: true,
      plan,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 404 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const body = (await request.json()) as { plan?: PipelineExplorePlan };

    if (!body.plan) {
      throw new Error("缺少 plan。");
    }

    const job = await updateProductionPlan(jobId, body.plan);

    return NextResponse.json({
      ok: true,
      job,
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
