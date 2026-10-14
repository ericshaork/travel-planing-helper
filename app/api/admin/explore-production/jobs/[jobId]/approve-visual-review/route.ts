import { NextResponse } from "next/server";

import { approveProductionVisualReview } from "@/lib/admin/explore-production/store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asIssues(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

export async function POST(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const score = Number(body.score);

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error("图文审核评分必须是 1-5 的整数。");
    }

    const job = await approveProductionVisualReview(jobId, {
      score,
      issues: asIssues(body.issues),
      comment: asString(body.comment) || undefined,
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
