import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  buildImageManifestFromPlan,
  generateMockExplorePlan,
} from "./generate";
import { createExploreRepository } from "../../explore/repository";
import type { ExploreTripContentInsert } from "../../explore/types";
import type {
  EditableImageAssetPayload,
  ExploreProductionJob,
  ExploreProductionRequest,
  ImageAssetDetail,
  ImageAssetRecord,
  ImageManifest,
  ImageManifestTask,
  ImagePipelineAssetSummary,
  ImagePipelineSummary,
  PipelineExplorePlan,
  PublishPreflightCheck,
  PublishPreflightReport,
  PublishPayloadRecord,
  ProductionArtifactKind,
  ProductionArtifactRef,
  ProductionStatus,
  VisualReviewRecord,
} from "./types";

const JOB_ROOT = path.resolve(
  process.cwd(),
  "travel-content-pipeline",
  "output",
  "production_jobs",
);
const execFileAsync = promisify(execFile);

function now() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createJobId(request: ExploreProductionRequest) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);

  return `${stamp}_${slugify(request.city)}_${request.travelerType}_${request.days}d`;
}

function jobDir(jobId: string) {
  return path.join(JOB_ROOT, jobId);
}

function jobPath(jobId: string) {
  return path.join(jobDir(jobId), "job.json");
}

function artifactPath(jobId: string, fileName: string) {
  return path.join(jobDir(jobId), fileName);
}

function imagePipelineOutputRoot(jobId: string) {
  return path.join(jobDir(jobId), "image_pipeline_runs");
}

function imagePipelineSummaryPath(jobId: string) {
  return artifactPath(jobId, "image_pipeline_summary.json");
}

function visualReviewPath(jobId: string) {
  return artifactPath(jobId, "visual_review.json");
}

function publishPayloadPath(jobId: string) {
  return artifactPath(jobId, "publish_payload.json");
}

function publishPreflightPath(jobId: string) {
  return artifactPath(jobId, "publish_preflight.json");
}

function contentInvalidationPath(jobId: string) {
  return artifactPath(jobId, "content_invalidation.json");
}

function manualImageAssetDir(jobId: string) {
  return path.join(jobDir(jobId), "manual_image_assets");
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseEnvContent(raw: string) {
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    values[key] = value;
  }

  return values;
}

async function readRootEnvFile(fileName: string) {
  try {
    return parseEnvContent(await readFile(path.join(process.cwd(), fileName), "utf8"));
  } catch {
    return {};
  }
}

async function buildImagePipelineEnv() {
  const rootEnv = {
    ...(await readRootEnvFile(".env")),
    ...(await readRootEnvFile(".env.local")),
  };
  const env = {
    ...process.env,
    ...rootEnv,
  };
  const pexelsApiKey =
    env.PEXELS_API_KEY ||
    env.PEXELS_KEY ||
    env.PEXELS_PHOTO_API_KEY ||
    env.NEXT_PUBLIC_PEXELS_API_KEY;

  if (pexelsApiKey) {
    env.PEXELS_API_KEY = pexelsApiKey;
  }

  return env;
}

function publicArtifactRef(
  kind: ProductionArtifactKind,
  absolutePath: string,
  metadata?: Record<string, unknown>,
): ProductionArtifactRef {
  return {
    kind,
    path: path.relative(process.cwd(), absolutePath).replaceAll("\\", "/"),
    createdAt: now(),
    ...(metadata ? { metadata } : {}),
  };
}

function upsertArtifact(
  artifacts: ProductionArtifactRef[],
  artifact: ProductionArtifactRef,
) {
  return [
    ...artifacts.filter((item) => item.kind !== artifact.kind),
    artifact,
  ];
}

const contentEditInvalidatedArtifactKinds: ProductionArtifactKind[] = [
  "content_review",
  "image_manifest",
  "image_asset",
  "visual_review",
  "publish_payload",
  "publish_preflight",
];
const imageManifestEditInvalidatedArtifactKinds: ProductionArtifactKind[] = [
  "image_asset",
  "visual_review",
  "publish_payload",
  "publish_preflight",
];
const imageEditInvalidatedArtifactKinds: ProductionArtifactKind[] = [
  "visual_review",
  "publish_payload",
  "publish_preflight",
];

function splitArtifactsForContentEdit(artifacts: ProductionArtifactRef[]) {
  const invalidated = artifacts.filter((artifact) =>
    contentEditInvalidatedArtifactKinds.includes(artifact.kind),
  );
  const active = artifacts.filter(
    (artifact) => !contentEditInvalidatedArtifactKinds.includes(artifact.kind),
  );

  return {
    active,
    invalidated,
  };
}

function statusAfterContentEdit(status: ProductionStatus): ProductionStatus {
  if (status === "draft_requested" || status === "content_generating") {
    return "content_review_pending";
  }

  if (status === "failed" || status === "rejected") {
    return "content_review_pending";
  }

  return "content_review_pending";
}

function splitArtifactsForImageEdit(artifacts: ProductionArtifactRef[]) {
  const invalidated = artifacts.filter((artifact) =>
    imageEditInvalidatedArtifactKinds.includes(artifact.kind),
  );
  const active = artifacts.filter(
    (artifact) => !imageEditInvalidatedArtifactKinds.includes(artifact.kind),
  );

  return {
    active,
    invalidated,
  };
}

function splitArtifactsForImageManifestEdit(artifacts: ProductionArtifactRef[]) {
  const invalidated = artifacts.filter((artifact) =>
    imageManifestEditInvalidatedArtifactKinds.includes(artifact.kind),
  );
  const active = artifacts.filter(
    (artifact) => !imageManifestEditInvalidatedArtifactKinds.includes(artifact.kind),
  );

  return {
    active,
    invalidated,
  };
}

function removeArtifacts(
  artifacts: ProductionArtifactRef[],
  kinds: ProductionArtifactKind[],
) {
  return artifacts.filter((artifact) => !kinds.includes(artifact.kind));
}

function statusAfterImageEdit(status: ProductionStatus): ProductionStatus {
  if (status === "visual_approved" || status === "published" || status === "publishing") {
    return "visual_review_pending";
  }

  return status;
}

async function saveJob(job: ExploreProductionJob) {
  await writeJson(jobPath(job.jobId), job);
  return job;
}

async function updateJobStatus(
  job: ExploreProductionJob,
  status: ProductionStatus,
  patch: Partial<ExploreProductionJob> = {},
) {
  return saveJob({
    ...job,
    ...patch,
    status,
    updatedAt: now(),
  });
}

export async function listProductionJobs() {
  await mkdir(JOB_ROOT, { recursive: true });
  const entries = await readdir(JOB_ROOT, { withFileTypes: true });
  const jobs: ExploreProductionJob[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    try {
      jobs.push(await readProductionJob(entry.name));
    } catch {
      // Ignore incomplete local job folders.
    }
  }

  return jobs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function readProductionJob(jobId: string) {
  return readJson<ExploreProductionJob>(jobPath(jobId));
}

export async function createProductionJob(request: ExploreProductionRequest) {
  const jobId = createJobId(request);
  const createdAt = now();
  const requestPath = artifactPath(jobId, "generation_request.json");
  const job: ExploreProductionJob = {
    jobId,
    status: "draft_requested",
    request,
    artifacts: [
      publicArtifactRef("generation_request", requestPath, {
        city: request.city,
        travelerType: request.travelerType,
        theme: request.theme,
      }),
    ],
    createdAt,
    updatedAt: createdAt,
  };

  await writeJson(requestPath, request);
  await saveJob(job);

  return job;
}

export async function generateProductionContent(jobId: string) {
  const job = await readProductionJob(jobId);
  await updateJobStatus(job, "content_generating");

  try {
    const plan = generateMockExplorePlan(job.request);
    const planPath = artifactPath(jobId, "explore_plan.json");
    const nextJob = await readProductionJob(jobId);

    await writeJson(planPath, plan);

    return updateJobStatus(nextJob, "content_review_pending", {
      artifacts: upsertArtifact(
        nextJob.artifacts,
        publicArtifactRef("explore_plan", planPath, {
          planId: plan.id,
          title: plan.title,
        }),
      ),
      lastError: undefined,
    });
  } catch (error) {
    const current = await readProductionJob(jobId);
    return updateJobStatus(current, "failed", {
      lastError: {
        code: "CONTENT_GENERATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
    });
  }
}

export async function readProductionPlan(jobId: string) {
  return readJson<PipelineExplorePlan>(artifactPath(jobId, "explore_plan.json"));
}

function validateProductionPlan(plan: PipelineExplorePlan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("计划内容必须是对象。");
  }

  if (!plan.id || !plan.slug || !plan.title.trim() || !plan.summary.trim()) {
    throw new Error("计划缺少 id、slug、标题或摘要。");
  }

  if (!plan.city?.name || !plan.city?.code) {
    throw new Error("计划缺少城市信息。");
  }

  if (!Number.isFinite(plan.days) || plan.days < 1) {
    throw new Error("计划天数不合法。");
  }

  if (!Array.isArray(plan.daily_itinerary) || plan.daily_itinerary.length === 0) {
    throw new Error("计划至少需要一天行程。");
  }

  for (const [dayIndex, day] of plan.daily_itinerary.entries()) {
    if (!day.title.trim() || !day.summary.trim()) {
      throw new Error(`第 ${dayIndex + 1} 天缺少标题或摘要。`);
    }

    if (!Array.isArray(day.activities) || day.activities.length === 0) {
      throw new Error(`第 ${dayIndex + 1} 天至少需要一个活动。`);
    }

    for (const [activityIndex, activity] of day.activities.entries()) {
      if (!activity.description.trim()) {
        throw new Error(
          `第 ${dayIndex + 1} 天第 ${activityIndex + 1} 个活动缺少描述。`,
        );
      }
    }
  }

  if (!Array.isArray(plan.pois) || !Array.isArray(plan.food)) {
    throw new Error("计划的地点和美食列表必须是数组。");
  }
}

export async function updateProductionPlan(
  jobId: string,
  plan: PipelineExplorePlan,
) {
  validateProductionPlan(plan);

  const job = await readProductionJob(jobId);
  const planPath = artifactPath(jobId, "explore_plan.json");
  const editedAt = now();
  const splitArtifacts = splitArtifactsForContentEdit(job.artifacts);
  const nextStatus = statusAfterContentEdit(job.status);

  await writeJson(planPath, plan);

  let nextArtifacts = upsertArtifact(
    splitArtifacts.active,
    publicArtifactRef("explore_plan", planPath, {
      planId: plan.id,
      title: plan.title,
      editedAt,
    }),
  );

  if (splitArtifacts.invalidated.length > 0) {
    const invalidationPath = contentInvalidationPath(jobId);
    const invalidationRecord = {
      reason: "plan_edited",
      message:
        "文案已被修改，旧的内容审核、图片需求、图片结果、图文审核和发布包不再作为当前有效产物。",
      invalidatedAt: editedAt,
      fromStatus: job.status,
      nextStatus,
      planId: plan.id,
      invalidatedArtifacts: splitArtifacts.invalidated.map((artifact) => ({
        kind: artifact.kind,
        path: artifact.path,
        createdAt: artifact.createdAt,
      })),
    };

    await writeJson(invalidationPath, invalidationRecord);

    nextArtifacts = upsertArtifact(
      nextArtifacts,
      publicArtifactRef("invalidation_report", invalidationPath, {
        reason: "plan_edited",
        invalidatedAt: editedAt,
        invalidatedKinds: splitArtifacts.invalidated.map(
          (artifact) => artifact.kind,
        ),
      }),
    );
  }

  return updateJobStatus(job, nextStatus, {
    artifacts: nextArtifacts,
    lastError: undefined,
  });
}

export async function readProductionImageManifest(jobId: string) {
  return readJson<ImageManifest>(artifactPath(jobId, "image_manifest.json"));
}

export async function readProductionImagePipelineSummary(jobId: string) {
  return readJson<ImagePipelineSummary>(imagePipelineSummaryPath(jobId));
}

export async function readProductionImageAssets(jobId: string) {
  const summary = await readProductionImagePipelineSummary(jobId);
  const assets: ImageAssetDetail[] = [];

  for (const asset of summary.assets) {
    const assetPath = path.resolve(process.cwd(), asset.file_path);
    assets.push({
      ...asset,
      image_asset: await readJson<ImageAssetRecord>(assetPath),
    });
  }

  return assets;
}

function sanitizeAssetFileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, "_")
      .replace(/^_+|_+$/g, "") || "manual_asset"
  );
}

function validateEditableImageAsset(asset: EditableImageAssetPayload, index: number) {
  if (!asset.asset_id || !asset.asset_instance_id) {
    throw new Error(`第 ${index + 1} 张图片缺少资产标识。`);
  }

  if (!asset.image_asset || typeof asset.image_asset !== "object") {
    throw new Error(`第 ${index + 1} 张图片缺少 image_asset。`);
  }

  const imageUrl =
    asset.image_asset.metadata?.image_url ||
    asset.image_asset.selection?.selected_candidate?.image_url ||
    asset.image_asset.file_path;

  if (!imageUrl) {
    throw new Error(`第 ${index + 1} 张图片缺少可预览地址。`);
  }
}

export async function updateProductionImageAssets(
  jobId: string,
  imageAssets: EditableImageAssetPayload[],
) {
  if (!Array.isArray(imageAssets)) {
    throw new Error("图片资产必须是数组。");
  }

  const job = await readProductionJob(jobId);
  const summary = await readProductionImagePipelineSummary(jobId);
  const nextAssets: ImagePipelineAssetSummary[] = [];
  const editedAt = now();
  const splitArtifacts = splitArtifactsForImageEdit(job.artifacts);
  const nextStatus = statusAfterImageEdit(job.status);

  for (const [index, asset] of imageAssets.entries()) {
    validateEditableImageAsset(asset, index);

    const existingPath = asset.file_path
      ? path.resolve(process.cwd(), asset.file_path)
      : null;
    const assetJsonPath =
      existingPath && existingPath.startsWith(jobDir(jobId))
        ? existingPath
        : path.join(
            manualImageAssetDir(jobId),
            `${sanitizeAssetFileName(asset.asset_instance_id)}.image_asset.json`,
          );
    const publicPath = toPublicPath(assetJsonPath);
    const imageAsset: ImageAssetRecord = {
      ...asset.image_asset,
      asset_id: asset.asset_id,
      asset_instance_id: asset.asset_instance_id,
      status: asset.status || asset.image_asset.status || "completed",
      metadata: {
        ...(asset.image_asset.metadata ?? {}),
        admin_review_status:
          asset.image_asset.metadata?.admin_review_status ?? "approved",
      },
      file_path:
        asset.image_asset.file_path ||
        asset.image_asset.metadata?.image_url ||
        asset.image_asset.selection?.selected_candidate?.image_url ||
        "",
    };

    await writeJson(assetJsonPath, imageAsset);

    nextAssets.push({
      asset_id: asset.asset_id,
      asset_instance_id: asset.asset_instance_id,
      file_path: publicPath,
      status: imageAsset.metadata?.admin_hidden ? "hidden" : imageAsset.status,
    });
  }

  const completedCount = nextAssets.filter((asset) => asset.status === "completed").length;
  const nextSummary: ImagePipelineSummary = {
    ...summary,
    completed_count: completedCount,
    task_count: nextAssets.length,
    assets: nextAssets,
  };
  const summaryPath = imagePipelineSummaryPath(jobId);

  await writeJson(summaryPath, nextSummary);

  let nextJobArtifacts = upsertArtifact(
    splitArtifacts.active,
    publicArtifactRef("image_asset", summaryPath, {
      taskCount: nextSummary.task_count,
      completedCount,
      editedAt,
      runDir: nextSummary.run_dir,
    }),
  );

  if (splitArtifacts.invalidated.length > 0) {
    const invalidationPath = contentInvalidationPath(jobId);
    const invalidationRecord = {
      reason: "image_assets_edited",
      message:
        "图片管理层已更新，旧的图文审核和发布包不再作为当前有效产物。",
      invalidatedAt: editedAt,
      fromStatus: job.status,
      nextStatus,
      invalidatedArtifacts: splitArtifacts.invalidated.map((artifact) => ({
        kind: artifact.kind,
        path: artifact.path,
        createdAt: artifact.createdAt,
      })),
    };

    await writeJson(invalidationPath, invalidationRecord);

    nextJobArtifacts = upsertArtifact(
      nextJobArtifacts,
      publicArtifactRef("invalidation_report", invalidationPath, {
        reason: "image_assets_edited",
        invalidatedAt: editedAt,
        invalidatedKinds: splitArtifacts.invalidated.map(
          (artifact) => artifact.kind,
        ),
      }),
    );
  }

  return updateJobStatus(job, nextStatus, {
    artifacts: nextJobArtifacts,
    lastError: undefined,
  });
}

export async function readProductionVisualReview(jobId: string) {
  return readJson<VisualReviewRecord>(visualReviewPath(jobId));
}

export async function readProductionPublishPayload(jobId: string) {
  return readJson<PublishPayloadRecord>(publishPayloadPath(jobId));
}

function validateImageManifest(manifest: ImageManifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("图片需求必须是对象。");
  }

  if (!manifest.trip_id || !manifest.city) {
    throw new Error("图片需求缺少 trip_id 或 city。");
  }

  if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
    throw new Error("图片需求至少需要一个图片槽位。");
  }

  for (const [index, image] of manifest.images.entries()) {
    if (!image.asset_id || !image.asset_instance_id || !image.image_slot) {
      throw new Error(`第 ${index + 1} 个图片槽位缺少基础标识。`);
    }

    if (!image.prompt.trim()) {
      throw new Error(`第 ${index + 1} 个图片槽位缺少 prompt。`);
    }

    if (!Array.isArray(image.search_keywords) || image.search_keywords.length === 0) {
      throw new Error(`第 ${index + 1} 个图片槽位至少需要一个搜索关键词。`);
    }
  }
}

export async function updateProductionImageManifest(
  jobId: string,
  manifest: ImageManifest,
) {
  validateImageManifest(manifest);

  const job = await readProductionJob(jobId);
  const manifestPath = artifactPath(jobId, "image_manifest.json");
  const editedAt = now();
  const splitArtifacts = splitArtifactsForImageManifestEdit(job.artifacts);

  await writeJson(manifestPath, manifest);

  let nextArtifacts = upsertArtifact(
    splitArtifacts.active,
    publicArtifactRef("image_manifest", manifestPath, {
      imageCount: manifest.images.length,
      editedAt,
    }),
  );

  if (splitArtifacts.invalidated.length > 0) {
    const invalidationPath = contentInvalidationPath(jobId);
    const invalidationRecord = {
      reason: "image_manifest_edited",
      message:
        "图片需求已被修改，旧的图片结果、图文审核、发布前校验和发布包不再作为当前有效产物。",
      invalidatedAt: editedAt,
      fromStatus: job.status,
      nextStatus: "image_manifest_ready",
      invalidatedArtifacts: splitArtifacts.invalidated.map((artifact) => ({
        kind: artifact.kind,
        path: artifact.path,
        createdAt: artifact.createdAt,
      })),
    };

    await writeJson(invalidationPath, invalidationRecord);

    nextArtifacts = upsertArtifact(
      nextArtifacts,
      publicArtifactRef("invalidation_report", invalidationPath, {
        reason: "image_manifest_edited",
        invalidatedAt: editedAt,
        invalidatedKinds: splitArtifacts.invalidated.map(
          (artifact) => artifact.kind,
        ),
      }),
    );
  }

  return updateJobStatus(job, "image_manifest_ready", {
    artifacts: nextArtifacts,
    lastError: undefined,
  });
}

export async function approveProductionContent(
  jobId: string,
  review: {
    score: number;
    issues: string[];
    comment?: string;
  },
) {
  const job = await readProductionJob(jobId);

  if (job.status !== "content_review_pending") {
    throw new Error("Only content_review_pending jobs can be approved.");
  }

  const plan = await readProductionPlan(jobId);
  const reviewPath = artifactPath(jobId, "content_review.json");
  const manifestPath = artifactPath(jobId, "image_manifest.json");
  const reviewPayload = {
    ...review,
    decision: "approved",
    reviewedAt: now(),
  };
  const manifest = buildImageManifestFromPlan(plan);

  await writeJson(reviewPath, reviewPayload);
  await writeJson(manifestPath, manifest);

  const baseArtifacts = removeArtifacts(job.artifacts, [
    "invalidation_report",
    "publish_preflight",
    "publish_payload",
    "visual_review",
    "image_asset",
  ]);
  const reviewedJob = await updateJobStatus(job, "content_approved", {
    artifacts: upsertArtifact(
      upsertArtifact(
        baseArtifacts,
        publicArtifactRef("content_review", reviewPath, {
          decision: "approved",
          score: review.score,
        }),
      ),
      publicArtifactRef("image_manifest", manifestPath, {
        imageCount: manifest.images.length,
      }),
    ),
    lastError: undefined,
  });

  return updateJobStatus(reviewedJob, "image_manifest_ready");
}

interface ImagePipelineExecutableAsset {
  asset_id: string;
  image_slot: ImageManifestTask["image_slot"];
  type: ImageManifestTask["type"];
  source_preference: ImageManifestTask["source_preference"];
  generation_mode: "real_photo";
  decision_reason: string;
  prompt: string;
  metadata: {
    asset_name: string;
    image_usage_profile: ImageManifestTask["image_usage_profile"];
    location_context: ImageManifestTask["location_context"];
    search_keywords: string[];
    visual_subject: ImageManifestTask["visual_subject"];
    download_output_dir: string;
    photo_source_candidates: Array<{
      source: "pexels" | "mock_gallery";
      priority: number;
      selection_hint: string;
    }>;
    mock_photo_sources: {
      mock_gallery: {
        candidates: Array<{
          title: string;
          description: string;
          width: number;
          height: number;
          mime_type: string;
          url: string;
          license: string;
          author: string;
          source_url: string;
        }>;
        download_file_path: string;
      };
    };
  };
}

interface ImagePipelineExecutableManifest {
  manifest_id: string;
  trip_id: string;
  schema_version: string;
  created_at: string;
  source_ref: string;
  assets: ImagePipelineExecutableAsset[];
}

interface ImagePipelineRunnerResult {
  summary: Omit<ImagePipelineSummary, "run_dir">;
  runDir: string;
}

function buildMockCandidate(image: ImageManifestTask) {
  const title = `${image.asset_name} travel reference photo`;
  const description = [
    image.prompt,
    image.search_keywords.join(" "),
    "travel street architecture landscape",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title,
    description,
    width: 2400,
    height: 1600,
    mime_type: "image/jpeg",
    url: `mock://phase3/source/${image.asset_instance_id}.jpg`,
    license: "CC BY phase3 mock",
    author: "Wanderly mock gallery",
    source_url: "mock://phase3/mock-gallery",
  };
}

function buildExecutableImageManifest(
  jobId: string,
  manifest: ImageManifest,
): ImagePipelineExecutableManifest {
  const manifestId = `${jobId}_image_pipeline`;
  const downloadOutputDir = path.join(
    imagePipelineOutputRoot(jobId),
    pipelineRunSlug(manifestId),
    "downloads",
  );

  return {
    manifest_id: manifestId,
    trip_id: manifest.trip_id,
    schema_version: "phase3-admin-execution-v1",
    created_at: now(),
    source_ref: `production_job://${jobId}/image_manifest.json`,
    assets: manifest.images.map((image) => ({
      asset_id: image.asset_id,
      image_slot: image.image_slot,
      type: image.type,
      source_preference: image.source_preference,
      generation_mode: "real_photo",
      decision_reason: image.decision_reason,
      prompt: image.prompt,
      metadata: {
        asset_name: image.asset_name,
        image_usage_profile: image.image_usage_profile,
        location_context: image.location_context,
        search_keywords: image.search_keywords,
        visual_subject: image.visual_subject,
        download_output_dir: downloadOutputDir,
        photo_source_candidates: [
          {
            source: "pexels",
            priority: 1,
            selection_hint:
              image.type === "food"
                ? "food_or_place_reference_photo"
                : "general_travel_reference_photo",
          },
          {
            source: "mock_gallery",
            priority: 2,
            selection_hint:
              image.type === "food"
                ? "food_or_place_reference_photo"
                : "general_travel_reference_photo",
          },
        ],
        mock_photo_sources: {
          mock_gallery: {
            candidates: [buildMockCandidate(image)],
            download_file_path: `mock://phase3/image-assets/${image.asset_instance_id}.jpg`,
          },
        },
      },
    })),
  };
}

function pipelineRunSlug(value: string, fallback = "manifest_run") {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function imagePipelineRunnerPath() {
  return path.join(
    process.cwd(),
    "image-pipeline",
    "image-pipeline",
    "src",
    "pipeline",
    "run_manifest_pipeline.js",
  );
}

async function runImagePipelineCli(
  executableManifestPath: string,
  outputRoot: string,
  executableManifest: ImagePipelineExecutableManifest,
): Promise<ImagePipelineRunnerResult> {
  await execFileAsync(process.execPath, [
    imagePipelineRunnerPath(),
    executableManifestPath,
    outputRoot,
  ], {
    env: await buildImagePipelineEnv(),
  });

  const runDir = path.join(
    outputRoot,
    pipelineRunSlug(executableManifest.manifest_id),
  );

  return {
    summary: await readJson<Omit<ImagePipelineSummary, "run_dir">>(
      path.join(runDir, "pipeline_summary.json"),
    ),
    runDir,
  };
}

function toPublicPath(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).replaceAll("\\", "/");
}

export async function runProductionImagePipeline(jobId: string) {
  const job = await readProductionJob(jobId);

  if (!job.artifacts.some((artifact) => artifact.kind === "image_manifest")) {
    throw new Error("当前任务还没有 image manifest，不能执行图片管线。");
  }

  await updateJobStatus(job, "image_fetching", {
    lastError: undefined,
  });

  try {
    const manifest = await readProductionImageManifest(jobId);
    const executableManifest = buildExecutableImageManifest(jobId, manifest);
    const executableManifestPath = artifactPath(jobId, "image_manifest.execution.json");
    const outputRoot = imagePipelineOutputRoot(jobId);

    await writeJson(executableManifestPath, executableManifest);

    const result = await runImagePipelineCli(
      executableManifestPath,
      outputRoot,
      executableManifest,
    );
    const summary: ImagePipelineSummary = {
      ...result.summary,
      run_dir: toPublicPath(result.runDir),
      assets: result.summary.assets.map((asset) => ({
        ...asset,
        file_path: toPublicPath(asset.file_path),
      })),
    };
    const summaryPath = imagePipelineSummaryPath(jobId);

    await writeJson(summaryPath, summary);

    const current = await readProductionJob(jobId);
    const completed = summary.completed_count;
    const status: ProductionStatus = completed > 0 ? "visual_review_pending" : "failed";

    return updateJobStatus(current, status, {
      artifacts: upsertArtifact(
        current.artifacts,
        publicArtifactRef("image_asset", summaryPath, {
          taskCount: summary.task_count,
          completedCount: completed,
          runDir: summary.run_dir,
        }),
      ),
      lastError:
        completed > 0
          ? undefined
          : {
              code: "IMAGE_PIPELINE_NO_COMPLETED_ASSET",
              message: "图片管线没有产出可用图片。",
              retryable: true,
            },
    });
  } catch (error) {
    const current = await readProductionJob(jobId);

    return updateJobStatus(current, "failed", {
      lastError: {
        code: "IMAGE_PIPELINE_FAILED",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
    });
  }
}

export async function approveProductionVisualReview(
  jobId: string,
  review: {
    score: number;
    issues: string[];
    comment?: string;
  },
) {
  const job = await readProductionJob(jobId);

  if (job.status !== "visual_review_pending") {
    throw new Error("Only visual_review_pending jobs can be approved.");
  }

  const summary = await readProductionImagePipelineSummary(jobId);
  const imageAssets = await readProductionImageAssets(jobId);

  if (summary.completed_count < 1) {
    throw new Error("没有完成的图片资产，不能通过图文审核。");
  }

  const completedAssets = imageAssets.filter(isPublishUsableImageAsset);

  if (completedAssets.length < 1) {
    throw new Error("图片管理层里没有已通过的可用图片，不能通过图文审核。");
  }

  const visualReview: VisualReviewRecord = {
    ...review,
    decision: "approved",
    reviewedAt: now(),
    imageStats: {
      taskCount: summary.task_count,
      completedCount: summary.completed_count,
    },
    approvedAssets: completedAssets.map((asset) => ({
      asset_id: asset.asset_id,
      asset_instance_id: asset.asset_instance_id,
      image_slot: asset.image_asset.image_slot,
      source: asset.image_asset.source,
      file_path: asset.image_asset.file_path,
      title: asset.image_asset.metadata?.title,
    })),
  };
  const reviewPath = visualReviewPath(jobId);

  await writeJson(reviewPath, visualReview);

  return updateJobStatus(job, "visual_approved", {
    artifacts: upsertArtifact(
      removeArtifacts(job.artifacts, [
        "invalidation_report",
        "publish_preflight",
        "publish_payload",
      ]),
      publicArtifactRef("visual_review", reviewPath, {
        decision: "approved",
        score: review.score,
        approvedAssetCount: completedAssets.length,
      }),
    ),
    lastError: undefined,
  });
}

function isBrowserImageUrl(value: string | undefined) {
  return Boolean(
    value &&
      (value.startsWith("https://") ||
        value.startsWith("http://") ||
        value.startsWith("/")),
  );
}

function getRemoteImageUrl(asset: ImageAssetDetail | undefined) {
  return (
    asset?.image_asset.metadata?.image_url ||
    asset?.image_asset.selection?.selected_candidate?.image_url
  );
}

function isPublishUsableImageAsset(asset: ImageAssetDetail) {
  return (
    asset.status === "completed" &&
    asset.image_asset.status === "completed" &&
    !asset.image_asset.metadata?.admin_hidden &&
    (asset.image_asset.metadata?.admin_review_status ?? "approved") === "approved"
  );
}

function getCoverImageUrl(
  visualReview: VisualReviewRecord,
  imageAssets: ImageAssetDetail[],
) {
  const managedCoverAsset = imageAssets.find(
    (asset) =>
      asset.image_asset.metadata?.admin_use_as_cover &&
      isPublishUsableImageAsset(asset),
  );
  const managedCoverUrl = getRemoteImageUrl(managedCoverAsset);

  if (isBrowserImageUrl(managedCoverUrl)) {
    return managedCoverUrl;
  }

  const coverReviewAsset =
    visualReview.approvedAssets.find(
      (asset) => asset.image_slot === "explore_cover",
    ) ?? visualReview.approvedAssets[0];
  const coverImageAsset = imageAssets.find(
    (asset) => asset.asset_instance_id === coverReviewAsset?.asset_instance_id,
  );
  const remoteImageUrl = getRemoteImageUrl(coverImageAsset);

  if (isBrowserImageUrl(remoteImageUrl)) {
    return remoteImageUrl;
  }

  if (isBrowserImageUrl(coverReviewAsset?.file_path)) {
    return coverReviewAsset?.file_path;
  }

  if (!coverReviewAsset?.file_path || coverReviewAsset.file_path.startsWith("mock://")) {
    return "/images/explore/fallback/explore-fallback-city.png";
  }

  return "/images/explore/fallback/explore-fallback-city.png";
}

function getPublishErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code || "EXPLORE_PUBLISH_FAILED")
    : "EXPLORE_PUBLISH_FAILED";
}

function getPublishErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function toExploreImageUrl(asset: ImageAssetDetail | undefined) {
  const remoteUrl = getRemoteImageUrl(asset);

  if (isBrowserImageUrl(remoteUrl)) {
    return remoteUrl;
  }

  if (isBrowserImageUrl(asset?.image_asset.file_path)) {
    return asset?.image_asset.file_path;
  }

  return undefined;
}

function findAssetImageUrl(
  imageAssets: ImageAssetDetail[],
  matcher: (asset: ImageAssetDetail) => boolean,
) {
  const asset = imageAssets.find((item) => isPublishUsableImageAsset(item) && matcher(item));

  return toExploreImageUrl(asset);
}

function buildProductionImageBindings(imageAssets: ImageAssetDetail[]) {
  return imageAssets
    .filter(isPublishUsableImageAsset)
    .map((asset) => ({
      assetId: asset.asset_id,
      assetInstanceId: asset.asset_instance_id,
      imageSlot: asset.image_asset.image_slot,
      source: asset.image_asset.source,
      title: asset.image_asset.metadata?.title,
      imageUrl: toExploreImageUrl(asset),
      sourceUrl: asset.image_asset.metadata?.source_url,
      license: asset.image_asset.metadata?.license,
      author: asset.image_asset.metadata?.author,
      useAsCover: Boolean(asset.image_asset.metadata?.admin_use_as_cover),
      reviewStatus: asset.image_asset.metadata?.admin_review_status ?? "approved",
    }))
    .filter((binding) => Boolean(binding.imageUrl));
}

function buildProductionHighlights(plan: PipelineExplorePlan) {
  return uniqueStrings([
    ...plan.tags,
    ...plan.daily_itinerary.map((day) => day.title),
    ...plan.pois.map((poi) => poi.name),
    ...plan.food.map((food) => food.name),
  ]).slice(0, 8);
}

function buildTerrainTags(request: ExploreProductionRequest) {
  const tags: string[] = [];

  if (request.preferences.includes("nature")) tags.push("nature");
  if (request.preferences.includes("history") || request.preferences.includes("museum")) {
    tags.push("culture");
  }
  if (request.preferences.includes("citywalk")) tags.push("citywalk");

  return uniqueStrings(tags);
}

function buildCuisineTags(request: ExploreProductionRequest, plan: PipelineExplorePlan) {
  return uniqueStrings([
    request.preferences.includes("food") ? "food" : undefined,
    ...plan.food.map((food) => food.category),
  ]);
}

function buildProductionExploreTrip(input: {
  job: ExploreProductionJob;
  plan: PipelineExplorePlan;
  imageManifest: ImageManifest;
  imageAssets: ImageAssetDetail[];
  visualReview: VisualReviewRecord;
  preflight: PublishPreflightReport;
  publishedAt: string;
}): ExploreTripContentInsert {
  const imageBindings = buildProductionImageBindings(input.imageAssets);
  const galleryImages = uniqueStrings(imageBindings.map((binding) => binding.imageUrl));
  const coverImageUrl = getCoverImageUrl(input.visualReview, input.imageAssets);
  const tags = uniqueStrings([
    ...input.plan.tags,
    ...input.job.request.preferences,
    input.job.request.theme,
    input.job.request.motivation,
  ]);
  const pois = input.plan.pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    district: poi.district,
    type: poi.type,
    reason: poi.reason,
    recommendedDurationMinutes: poi.recommended_duration_minutes,
    imageUrl: findAssetImageUrl(
      input.imageAssets,
      (asset) => asset.asset_id === poi.id || asset.image_asset.asset_id === poi.id,
    ),
  }));
  const food = input.plan.food.map((foodItem) => ({
    id: foodItem.id,
    name: foodItem.name,
    district: foodItem.district,
    category: foodItem.category,
    reason: foodItem.reason,
    imageUrl: findAssetImageUrl(
      input.imageAssets,
      (asset) =>
        asset.asset_id === foodItem.id || asset.image_asset.asset_id === foodItem.id,
    ),
  }));

  return {
    externalId: input.plan.id,
    slug: input.plan.slug,
    title: input.plan.title,
    summary: input.plan.summary,
    city: input.plan.city.name,
    cityCode: input.plan.city.code,
    region: input.plan.city.region_name,
    tripType: input.plan.trip_type,
    days: input.plan.days,
    tags,
    theme: input.job.request.theme,
    pace: input.plan.pace,
    budgetLevel: input.plan.budget.level,
    budgetNote: input.plan.budget.note,
    coverImageUrl,
    imagePrompt: input.plan.image_prompt,
    archiveIntro: input.plan.summary,
    creatorType: "editorial",
    creatorId: "explore-production-admin",
    creator: "Wanderly 编辑台",
    terrainTags: buildTerrainTags(input.job.request),
    cuisineTags: buildCuisineTags(input.job.request, input.plan),
    seasonTags: uniqueStrings([input.job.request.season]),
    companionTags: uniqueStrings([input.job.request.travelerType]),
    highlights: buildProductionHighlights(input.plan),
    dailyItinerary: input.plan.daily_itinerary.map((day, index) => ({
      dayNumber: day.day || index + 1,
      title: day.title,
      summary: day.summary,
      activities: day.activities.map((activity) => ({
        timeBlock: activity.time_block,
        description: activity.description,
        poiRefs: activity.poi_refs,
        foodRefs: activity.food_refs,
      })),
    })),
    pois,
    food,
    status: "published",
    reviewStatus: "approved",
    source: {
      pipeline: "travel-content-pipeline",
      batchId: "explore-production-admin",
      sourceContentKey: input.plan.id,
      sourceFilePath: `production_jobs/${input.job.jobId}/explore_plan.json`,
    },
    rawContent: {
      plan: input.plan,
      imageManifest: input.imageManifest,
      imageAssets: input.imageAssets.map((asset) => asset.image_asset),
      imageBindings,
      galleryImages,
      coverImageUrl,
      visualReview: input.visualReview,
      preflight: input.preflight,
      productionJob: {
        jobId: input.job.jobId,
        request: input.job.request,
        statusAtPublish: input.job.status,
      },
    },
    publishedAt: input.publishedAt,
  };
}

function createPreflightReport(checks: PublishPreflightCheck[]): PublishPreflightReport {
  const blockers = checks.filter((check) => check.status === "failed");
  const warnings = checks.filter((check) => check.status === "warning");

  return {
    generatedAt: now(),
    passed: blockers.length === 0,
    checks,
    blockers,
    warnings,
  };
}

function preflightCheck(
  id: string,
  label: string,
  status: PublishPreflightCheck["status"],
  message: string,
): PublishPreflightCheck {
  return {
    id,
    label,
    status,
    message,
  };
}

export async function buildProductionPublishPreflight(
  jobId: string,
): Promise<PublishPreflightReport> {
  const checks: PublishPreflightCheck[] = [];
  const job = await readProductionJob(jobId);
  let plan: PipelineExplorePlan | null = null;
  let visualReview: VisualReviewRecord | null = null;
  let imageManifest: ImageManifest | null = null;
  let imageAssets: ImageAssetDetail[] = [];

  try {
    plan = await readProductionPlan(jobId);
  } catch {
    checks.push(
      preflightCheck("plan_exists", "文案计划", "failed", "缺少 explore_plan.json。"),
    );
  }

  try {
    visualReview = await readProductionVisualReview(jobId);
  } catch {
    checks.push(
      preflightCheck(
        "visual_review_exists",
        "图文审核",
        "failed",
        "缺少已通过的图文审核记录。",
      ),
    );
  }

  try {
    imageManifest = await readProductionImageManifest(jobId);
  } catch {
    checks.push(
      preflightCheck(
        "image_manifest_exists",
        "图片需求",
        "failed",
        "缺少 image_manifest.json。",
      ),
    );
  }

  try {
    imageAssets = await readProductionImageAssets(jobId);
  } catch {
    checks.push(
      preflightCheck(
        "image_assets_exist",
        "图片资产",
        "failed",
        "缺少图片资产结果，请先执行图片管线。",
      ),
    );
  }

  checks.push(
    preflightCheck(
      "job_status",
      "任务状态",
      job.status === "visual_approved" || job.status === "published"
        ? "passed"
        : "failed",
      job.status === "visual_approved" || job.status === "published"
        ? "任务已处于可发布状态。"
        : `当前状态是 ${job.status}，需要先通过图文审核。`,
    ),
  );

  if (plan) {
    checks.push(
      preflightCheck(
        "plan_required_fields",
        "文案必填项",
        plan.title.trim() &&
          plan.summary.trim() &&
          plan.city.name.trim() &&
          plan.slug.trim()
          ? "passed"
          : "failed",
        "标题、摘要、城市和 slug 必须完整。",
      ),
    );

    checks.push(
      preflightCheck(
        "day_count",
        "天数一致性",
        plan.days === plan.daily_itinerary.length && plan.days > 0
          ? "passed"
          : "failed",
        `计划标记 ${plan.days} 天，实际有 ${plan.daily_itinerary.length} 天行程。`,
      ),
    );

    const poiIds = new Set(plan.pois.map((poi) => poi.id));
    const foodIds = new Set(plan.food.map((food) => food.id));
    const missingRefs = plan.daily_itinerary.flatMap((day) =>
      day.activities.flatMap((activity) => [
        ...activity.poi_refs
          .filter((id) => !poiIds.has(id))
          .map((id) => `Day ${day.day} 缺少 POI ref: ${id}`),
        ...activity.food_refs
          .filter((id) => !foodIds.has(id))
          .map((id) => `Day ${day.day} 缺少 Food ref: ${id}`),
      ]),
    );

    checks.push(
      preflightCheck(
        "route_refs",
        "路线引用",
        missingRefs.length === 0 ? "passed" : "failed",
        missingRefs.length === 0
          ? "每日路线引用的 POI/美食都存在。"
          : missingRefs.slice(0, 4).join("；"),
      ),
    );

    checks.push(
      preflightCheck(
        "content_depth",
        "内容厚度",
        plan.pois.length >= 2 && plan.food.length >= 1 && plan.tags.length >= 2
          ? "passed"
          : "warning",
        "建议至少包含 2 个地点、1 个美食线索和 2 个标签。",
      ),
    );
  }

  const usableAssets = imageAssets.filter(isPublishUsableImageAsset);

  checks.push(
    preflightCheck(
      "usable_images",
      "可发布图片",
      usableAssets.length > 0 ? "passed" : "failed",
      usableAssets.length > 0
        ? `有 ${usableAssets.length} 张已通过且未禁用的图片。`
        : "没有可发布图片，请至少通过一张图片。",
    ),
  );

  if (visualReview) {
    const usableAssetIds = new Set(usableAssets.map((asset) => asset.asset_instance_id));
    const staleApprovedAssets = visualReview.approvedAssets.filter(
      (asset) => !usableAssetIds.has(asset.asset_instance_id),
    );

    checks.push(
      preflightCheck(
        "visual_review_current",
        "图文审核有效性",
        staleApprovedAssets.length === 0 && visualReview.approvedAssets.length > 0
          ? "passed"
          : "failed",
        staleApprovedAssets.length === 0 && visualReview.approvedAssets.length > 0
          ? "图文审核中的图片仍然可用。"
          : "图文审核记录已和当前图片管理层不一致，请重新通过图文审核。",
      ),
    );
  }

  if (visualReview && imageAssets.length > 0) {
    const coverUrl = getCoverImageUrl(visualReview, imageAssets);
    const hasCoverUrl = Boolean(coverUrl);
    const usesFallback = coverUrl?.includes("/images/explore/fallback/") ?? true;

    checks.push(
      preflightCheck(
        "cover_image",
        "封面图片",
        hasCoverUrl && !usesFallback ? "passed" : "failed",
        hasCoverUrl && !usesFallback
          ? "已找到可用于探索页的封面图片。"
          : "未找到可用封面，请在图片管理里设置一张已通过图片为封面。",
      ),
    );
  }

  if (imageManifest) {
    checks.push(
      preflightCheck(
        "manifest_alignment",
        "图片需求覆盖",
        imageManifest.images.length > 0 &&
          usableAssets.length <= imageManifest.images.length + 3
          ? "passed"
          : "warning",
        "图片资产数量应和图片需求大致匹配，手动导入少量补充图是允许的。",
      ),
    );
  }

  const missingSource = usableAssets.filter(
    (asset) =>
      !asset.image_asset.metadata?.source_url &&
      asset.image_asset.source !== "manual_import",
  );

  checks.push(
    preflightCheck(
      "image_attribution",
      "图片来源信息",
      missingSource.length === 0 ? "passed" : "warning",
      missingSource.length === 0
        ? "可发布图片都有来源记录。"
        : `${missingSource.length} 张图片缺少来源页，建议补充后再发布。`,
    ),
  );

  return createPreflightReport(checks);
}

export async function publishProductionJob(jobId: string) {
  const job = await readProductionJob(jobId);

  if (job.status !== "visual_approved" && job.status !== "published") {
    throw new Error("Only visual_approved jobs can be published.");
  }

  const preflight = await buildProductionPublishPreflight(jobId);
  const preflightPath = publishPreflightPath(jobId);

  await writeJson(preflightPath, preflight);

  if (!preflight.passed) {
    await updateJobStatus(job, job.status, {
      artifacts: upsertArtifact(
        job.artifacts,
        publicArtifactRef("publish_preflight", preflightPath, {
          passed: preflight.passed,
          blockerCount: preflight.blockers.length,
          warningCount: preflight.warnings.length,
        }),
      ),
      lastError: {
        code: "PUBLISH_PREFLIGHT_FAILED",
        message: preflight.blockers.map((check) => check.message).join("；"),
        retryable: true,
      },
    });

    throw new Error(
      `发布前校验未通过：${preflight.blockers
        .map((check) => check.message)
        .join("；")}`,
    );
  }

  const plan = await readProductionPlan(jobId);
  const visualReview = await readProductionVisualReview(jobId);
  const imageManifest = await readProductionImageManifest(jobId);
  const imageAssets = await readProductionImageAssets(jobId);
  const publishedAt = now();
  const exploreTrip = buildProductionExploreTrip({
    job,
    plan,
    imageManifest,
    imageAssets,
    visualReview,
    preflight,
    publishedAt,
  });

  // Keep the explicit production envelope visible for downstream audits.
  exploreTrip.rawContent = {
    ...exploreTrip.rawContent,
    sourceArtifacts: {
      plan,
      imageManifest,
      imageAssets: imageAssets.map((asset) => asset.image_asset),
      visualReview,
      preflight,
    },
  };
  const payloadPath = publishPayloadPath(jobId);
  let payload: PublishPayloadRecord = {
    generatedAt: publishedAt,
    status: "payload_prepared",
    exploreTrip,
    visualReview,
    imageAssets,
    preflight,
    database: {
      attempted: false,
      success: false,
    },
  };

  await writeJson(payloadPath, payload);

  const publishingJob = await updateJobStatus(job, "publishing", {
    artifacts: upsertArtifact(
      upsertArtifact(
        job.artifacts,
        publicArtifactRef("publish_preflight", preflightPath, {
          passed: preflight.passed,
          blockerCount: preflight.blockers.length,
          warningCount: preflight.warnings.length,
        }),
      ),
      publicArtifactRef("publish_payload", payloadPath, {
        externalId: exploreTrip.externalId,
        slug: exploreTrip.slug,
        status: payload.status,
      }),
    ),
    lastError: undefined,
  });

  try {
    const publishedItem = await createExploreRepository().upsertImportedContent(
      exploreTrip,
    );

    payload = {
      ...payload,
      status: "published",
      database: {
        attempted: true,
        success: true,
        item: {
          id: publishedItem.id,
          externalId: publishedItem.externalId,
          slug: publishedItem.slug,
          title: publishedItem.title,
          status: publishedItem.status,
          publishedAt: publishedItem.publishedAt,
        },
      },
    };

    await writeJson(payloadPath, payload);

    return {
      job: await updateJobStatus(publishingJob, "published", {
        artifacts: upsertArtifact(
          publishingJob.artifacts,
          publicArtifactRef("publish_payload", payloadPath, {
            externalId: exploreTrip.externalId,
            slug: exploreTrip.slug,
            status: payload.status,
            databaseItemId: publishedItem.id,
          }),
        ),
        lastError: undefined,
      }),
      publishPayload: payload,
    };
  } catch (error) {
    payload = {
      ...payload,
      status: "failed",
      database: {
        attempted: true,
        success: false,
        error: {
          code: getPublishErrorCode(error),
          message: getPublishErrorMessage(error),
        },
      },
    };

    await writeJson(payloadPath, payload);

    return {
      job: await updateJobStatus(publishingJob, "visual_approved", {
        artifacts: upsertArtifact(
          publishingJob.artifacts,
          publicArtifactRef("publish_payload", payloadPath, {
            externalId: exploreTrip.externalId,
            slug: exploreTrip.slug,
            status: payload.status,
          }),
        ),
        lastError: {
          code: payload.database.error?.code ?? "EXPLORE_PUBLISH_FAILED",
          message:
            payload.database.error?.message ??
            "Explore 发布失败，已保留 publish payload。",
          retryable: true,
        },
      }),
      publishPayload: payload,
    };
  }
}

export function getProductionJobRoot() {
  return JOB_ROOT;
}
