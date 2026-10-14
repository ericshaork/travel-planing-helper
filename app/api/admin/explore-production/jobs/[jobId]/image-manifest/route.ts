import { NextResponse } from "next/server";

import {
  readProductionImageManifest,
  updateProductionImageManifest,
} from "@/lib/admin/explore-production/store";
import type { ImageManifest } from "@/lib/admin/explore-production/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const imageManifest = await readProductionImageManifest(jobId);

    return NextResponse.json({
      ok: true,
      imageManifest,
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
    const body = (await request.json()) as { imageManifest?: ImageManifest };

    if (!body.imageManifest) {
      throw new Error("缺少 imageManifest。");
    }

    const job = await updateProductionImageManifest(jobId, body.imageManifest);

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

