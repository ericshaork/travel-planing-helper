import {
  buildGenerationContextWithAssets,
  type GenerationContextWithAssets,
} from "./buildGenerationContextWithAssets.js";
import type { CandidateSelectionRequest } from "../contentAsset/index.js";
import type { RequestContext } from "./types.js";

function assertIncludesAll(actual: string[], expected: string[], label: string): void {
  const missing = expected.filter((item) => !actual.includes(item));
  if (missing.length > 0) {
    throw new Error(`${label} is missing expected assets: ${missing.join(", ")}`);
  }
}

function assertSummaryIncludesRoles(actual: string[], expected: string[], label: string): void {
  const missing = expected.filter((item) => !actual.includes(item));
  if (missing.length > 0) {
    throw new Error(`${label} summary is missing expected roles: ${missing.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();

  const scenarios: Array<{
    label: string;
    request: RequestContext;
    contentAssetRequest: CandidateSelectionRequest;
    expectedAssetIds: string[];
    expectedSummaryRoles: string[];
  }> = [
    {
      label: "couple_first_visit_autumn",
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
      expectedAssetIds: [
        "ca_beijing_forbidden_city",
        "ca_beijing_jingshan_park",
        "ca_beijing_beihai_park",
        "ca_beijing_shichahai",
        "ca_beijing_liangma_river",
      ],
      expectedSummaryRoles: ["signature_anchor", "evening_closure"],
    },
    {
      label: "student_food_exploration_winter",
      request: {
        city: "beijing",
        traveler_type: "student",
        days: 3,
        season: "winter",
        budget: "low",
        pace: "balanced",
        motivation: "美食探索",
        theme: "北京高性价比冬季美食路线",
      },
      contentAssetRequest: {
        traveler: "student",
        season: "winter",
        purpose: "food_exploration",
        days: 3,
      },
      expectedAssetIds: [
        "ca_beijing_niujie",
        "ca_beijing_huguosi_food",
        "ca_beijing_qianmen_food",
        "ca_beijing_gulou",
      ],
      expectedSummaryRoles: ["food_backbone"],
    },
    {
      label: "solo_deep_exploration_spring",
      request: {
        city: "beijing",
        traveler_type: "solo",
        days: 3,
        season: "spring",
        budget: "medium",
        pace: "slow",
        motivation: "深度探索",
        theme: "北京一人慢行观察路线",
      },
      contentAssetRequest: {
        traveler: "solo",
        season: "spring",
        purpose: "deep_exploration",
        days: 3,
      },
      expectedAssetIds: [
        "ca_beijing_baita_temple",
        "ca_beijing_wudaoying",
        "ca_beijing_culture_pause_asset",
        "ca_beijing_shichahai",
        "ca_beijing_798_art_district",
      ],
      expectedSummaryRoles: ["slow_walk_anchor", "browse_asset", "historic_texture"],
    },
  ];

  const results: Array<{
    scenario: string;
    request: RequestContext;
    content_asset_request: CandidateSelectionRequest;
    generation_context_with_assets: GenerationContextWithAssets;
  }> = [];

  for (const scenario of scenarios) {
    const context = await buildGenerationContextWithAssets({
      projectRoot,
      request: scenario.request,
      contentAssetRequest: scenario.contentAssetRequest,
    });

    const selectedAssetIds = context.content_asset_context.selected_assets.map((item) => item.asset_id);

    assertIncludesAll(selectedAssetIds, scenario.expectedAssetIds, scenario.label);
    assertSummaryIncludesRoles(
      context.content_asset_context.summary.roles,
      scenario.expectedSummaryRoles,
      scenario.label,
    );

    if (
      context.content_asset_context.selected_assets.some(
        (item) =>
          item.image_context.images.length === 0 ||
          item.image_context.images.some(
            (image) =>
              !image.image_slot ||
              !image.source_preference ||
              !image.generation_mode ||
              !image.decision_reason ||
              !image.confidence,
          ),
      )
    ) {
      throw new Error(`${scenario.label} contains a selected asset without image_context images`);
    }

    if (!context.map_context || !Array.isArray(context.map_context.verified_pois)) {
      throw new Error(`${scenario.label} lost independent map_context`);
    }

    results.push({
      scenario: scenario.label,
      request: scenario.request,
      content_asset_request: scenario.contentAssetRequest,
      generation_context_with_assets: context,
    });
  }

  console.log(
    JSON.stringify(
      {
        city: "beijing",
        scenarios: results,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`GenerationContext with assets test failed: ${message}`);
  process.exitCode = 1;
});
