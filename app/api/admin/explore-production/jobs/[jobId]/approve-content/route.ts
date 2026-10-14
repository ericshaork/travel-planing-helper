import { NextResponse } from "next/server";

import { approveProductionContent } from "@/lib/admin/explore-production/store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function POST(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const score = Number(body.score);

  try {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error("评分必须是 1-5 的整数。");
    }

    const job = await approveProductionContent(jobId, {
      score,
      issues: asStringArray(body.issues),
      comment: typeof body.comment === "string" ? body.comment : "",
    });

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

