import { NextResponse } from "next/server";

import {
  readProductionImageAssets,
  updateProductionImageAssets,
} from "@/lib/admin/explore-production/store";
import type { EditableImageAssetPayload } from "@/lib/admin/explore-production/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const imageAssets = await readProductionImageAssets(jobId);

    return NextResponse.json({
      ok: true,
      imageAssets,
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
    const body = (await request.json()) as {
      imageAssets?: EditableImageAssetPayload[];
    };

    if (!body.imageAssets) {
      throw new Error("缺少 imageAssets。");
    }

    const job = await updateProductionImageAssets(jobId, body.imageAssets);

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
