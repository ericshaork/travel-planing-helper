import path from "node:path";

import { exportImageManifest, type CandidateSelectionRequest, type ImageManifest } from "./contentAsset/index.js";
import { buildGenerationContextWithAssets } from "./context/buildGenerationContextWithAssets.js";
import { writeJsonFile } from "./format.js";

import type { RequestContext } from "./context/types.js";

interface ManifestCase {
  id: string;
  output_file: string;
  request: RequestContext;
  contentAssetRequest: CandidateSelectionRequest;
  requiredAssetIds: string[];
}

const allowedSourcePreferences = new Set(["real_first", "mixed", "ai_first"]);
const allowedGenerationModes = new Set(["real_photo", "hybrid", "ai_generated"]);

const manifestCases: ManifestCase[] = [
  {
    id: "beijing_couple_image_manifest_v1_1",
    output_file: "beijing_couple_image_manifest_v1_1.json",
    request: {
      city: "beijing",
      traveler_type: "couple",
      days: 3,
      season: "autumn",
      budget: "medium",
      pace: "balanced",
      motivation: "首次到访",
      theme: "首次北京印象 / 情侣氛围路线",
    },
    contentAssetRequest: {
      traveler: "couple",
      season: "autumn",
      purpose: "first_visit",
      days: 3,
    },
    requiredAssetIds: [
      "ca_beijing_forbidden_city",
      "ca_beijing_jingshan_park",
      "ca_beijing_beihai_park",
      "ca_beijing_shichahai",
      "ca_beijing_liangma_river",
    ],
  },
  {
    id: "beijing_student_image_manifest_v1_1",
    output_file: "beijing_student_image_manifest_v1_1.json",
    request: {
      city: "beijing",
      traveler_type: "student",
      days: 3,
      season: "winter",
      budget: "low",
      pace: "balanced",
      motivation: "美食探索",
      theme: "北京冬季美食 / 学生高性价比路线",
    },
    contentAssetRequest: {
      traveler: "student",
      season: "winter",
      purpose: "food_exploration",
      days: 3,
    },
    requiredAssetIds: [
      "ca_beijing_niujie",
      "ca_beijing_huguosi_food",
      "ca_beijing_qianmen_food",
      "ca_beijing_gulou",
    ],
  },
  {
    id: "beijing_solo_image_manifest_v1_1",
    output_file: "beijing_solo_image_manifest_v1_1.json",
    request: {
      city: "beijing",
      traveler_type: "solo",
      days: 3,
      season: "spring",
      budget: "medium",
      pace: "slow",
      motivation: "深度探索",
      theme: "北京街区纹理 / 一个人的慢节奏探索",
    },
    contentAssetRequest: {
      traveler: "solo",
      season: "spring",
      purpose: "deep_exploration",
      days: 3,
    },
    requiredAssetIds: [
      "ca_beijing_baita_temple",
      "ca_beijing_wudaoying",
      "ca_beijing_culture_pause_asset",
      "ca_beijing_shichahai",
      "ca_beijing_798_art_district",
    ],
  },
];

function assertImageManifest(
  manifest: ImageManifest,
  selectedAssetIds: string[],
  requiredAssetIds: string[],
  caseId: string,
): void {
  if (manifest.images.length === 0) {
    throw new Error(`Image manifest is empty for ${caseId}`);
  }

  const assetIds = [...new Set(manifest.images.map((image) => image.asset_id))].sort();
  const selectedSorted = [...selectedAssetIds].sort();

  if (assetIds.join("|") !== selectedSorted.join("|")) {
    throw new Error(
      `Manifest asset mismatch for ${caseId}. Expected ${selectedSorted.join(", ")}, received ${assetIds.join(", ")}`,
    );
  }

  const missingRequiredAssets = requiredAssetIds.filter((assetId) => !assetIds.includes(assetId));
  if (missingRequiredAssets.length > 0) {
    throw new Error(
      `Manifest required assets missing for ${caseId}: ${missingRequiredAssets.join(", ")}`,
    );
  }

  if (manifest.images.length > selectedAssetIds.length * 3) {
    throw new Error(`Image manifest count is unexpectedly large for ${caseId}: ${manifest.images.length}`);
  }

  for (const image of manifest.images) {
    if (
      !image.asset_instance_id ||
      !image.asset_id ||
      !image.asset_name ||
      !image.image_slot ||
      !image.type ||
      !image.source_preference ||
      !image.generation_mode ||
      !image.decision_reason ||
      !image.prompt ||
      !image.location_context ||
      !image.location_context.city ||
      !image.location_context.poi ||
      !Array.isArray(image.location_context.keywords) ||
      image.location_context.keywords.length === 0 ||
      !Array.isArray(image.search_keywords) ||
      image.search_keywords.length === 0 ||
      !image.visual_subject ||
      !image.visual_subject.main_subject ||
      !Array.isArray(image.visual_subject.secondary_elements) ||
      image.visual_subject.secondary_elements.length === 0 ||
      !image.image_usage_profile ||
      !image.review_requirement ||
      typeof image.review_requirement.required !== "boolean" ||
      !image.review_requirement.reason ||
      image.status !== "pending"
    ) {
      throw new Error(`Incomplete image task detected for ${caseId}: ${image.asset_id}`);
    }

    if (!allowedSourcePreferences.has(image.source_preference)) {
      throw new Error(`Invalid source_preference for ${caseId}: ${image.source_preference}`);
    }

    if (!allowedGenerationModes.has(image.generation_mode)) {
      throw new Error(`Invalid generation_mode for ${caseId}: ${image.generation_mode}`);
    }

    if (image.asset_instance_id !== `${image.asset_id}_${image.image_slot}`) {
      throw new Error(`Invalid asset_instance_id for ${caseId}: ${image.asset_instance_id}`);
    }
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const results: Array<{
    case_id: string;
    output_path: string;
    image_count: number;
    asset_ids: string[];
  }> = [];

  for (const manifestCase of manifestCases) {
    const generationContext = await buildGenerationContextWithAssets({
      projectRoot,
      request: manifestCase.request,
      contentAssetRequest: manifestCase.contentAssetRequest,
    });

    const manifest = exportImageManifest({
      trip_id: manifestCase.id,
      city: manifestCase.request.city,
      content_asset_context: generationContext.content_asset_context,
    });

    const selectedAssetIds = generationContext.content_asset_context.selected_assets.map((asset) => asset.asset_id);

    assertImageManifest(
      manifest,
      selectedAssetIds,
      manifestCase.requiredAssetIds,
      manifestCase.id,
    );

    const outputPath = path.resolve(projectRoot, "output", "image_manifest", manifestCase.output_file);
    await writeJsonFile(outputPath, manifest);

    results.push({
      case_id: manifestCase.id,
      output_path: outputPath,
      image_count: manifest.images.length,
      asset_ids: [...new Set(manifest.images.map((image) => image.asset_id))],
    });
  }

  console.log("Image manifest export completed:");
  for (const result of results) {
    console.log(`- case: ${result.case_id}`);
    console.log(`  output: ${result.output_path}`);
    console.log(`  image_count: ${result.image_count}`);
    console.log(`  asset_ids: ${result.asset_ids.join(", ")}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Image manifest export failed: ${message}`);
  process.exitCode = 1;
});
