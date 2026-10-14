import { NextResponse } from "next/server";

import {
  buildProductionPublishPreflight,
  readProductionImageAssets,
  readProductionImageManifest,
  readProductionImagePipelineSummary,
  readProductionJob,
  readProductionPlan,
  readProductionPublishPayload,
  readProductionVisualReview,
} from "@/lib/admin/explore-production/store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const job = await readProductionJob(jobId);
    let plan = null;
    let imageManifest = null;
    let imagePipelineSummary = null;
    let imageAssets = null;
    let visualReview = null;
    let publishPayload = null;
    let publishPreflight = null;

    if (job.artifacts.some((artifact) => artifact.kind === "explore_plan")) {
      plan = await readProductionPlan(jobId);
    }

    if (job.artifacts.some((artifact) => artifact.kind === "image_manifest")) {
      imageManifest = await readProductionImageManifest(jobId);
    }

    if (job.artifacts.some((artifact) => artifact.kind === "image_asset")) {
      imagePipelineSummary = await readProductionImagePipelineSummary(jobId);
      imageAssets = await readProductionImageAssets(jobId);
    }

    if (job.artifacts.some((artifact) => artifact.kind === "visual_review")) {
      visualReview = await readProductionVisualReview(jobId);
    }

    if (job.artifacts.some((artifact) => artifact.kind === "publish_payload")) {
      publishPayload = await readProductionPublishPayload(jobId);
    }

    if (job.artifacts.some((artifact) => artifact.kind === "explore_plan")) {
      publishPreflight = await buildProductionPublishPreflight(jobId);
    }

    return NextResponse.json({
      ok: true,
      job,
      plan,
      imageManifest,
      imagePipelineSummary,
      imageAssets,
      visualReview,
      publishPayload,
      publishPreflight,
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
