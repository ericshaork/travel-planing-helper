import {
  loadAssetsWithDiagnostics,
  rankAssets,
  selectCandidates,
  type CandidateSelectionRequest,
} from "../contentAsset/index.js";
import { buildContentAssetContext } from "./contentAssetContextBuilder.js";

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
  const { assets, errors } = await loadAssetsWithDiagnostics("beijing");

  if (errors.length > 0) {
    throw new Error(`Content asset loading failed:\n${errors.join("\n")}`);
  }

  const scenarios: Array<{
    label: string;
    profile: CandidateSelectionRequest;
    expectedAssetIds: string[];
    expectedSummaryRoles: string[];
  }> = [
    {
      label: "couple_first_visit_autumn",
      profile: {
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
      profile: {
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
      profile: {
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

  const results = scenarios.map(({ label, profile, expectedAssetIds, expectedSummaryRoles }) => {
    const ranked = rankAssets(profile, assets);
    const selection = selectCandidates(profile, ranked);
    const contentAssetContext = buildContentAssetContext(selection);
    const selectedAssetIds = contentAssetContext.selected_assets.map((item) => item.asset_id);

    assertIncludesAll(selectedAssetIds, expectedAssetIds, label);
    assertSummaryIncludesRoles(contentAssetContext.summary.roles, expectedSummaryRoles, label);

    if (
      contentAssetContext.selected_assets.some(
        (item) =>
          item.selection_reason.length === 0 ||
          item.image_context.images.length === 0 ||
          item.image_context.images.some(
            (image) =>
              !image.type ||
              !image.image_slot ||
              !image.purpose ||
              !image.prompt ||
              !image.source_preference ||
              !image.generation_mode ||
              !image.decision_reason ||
              !image.confidence ||
              !image.status ||
              image.status !== "pending",
          ),
      )
    ) {
      throw new Error(`${label} contains an invalid content asset context item`);
    }

    const sampleAssetName =
      label === "couple_first_visit_autumn"
        ? "故宫博物院"
        : label === "student_food_exploration_winter"
          ? "牛街"
          : "白塔寺";
    const sampleImageContext = contentAssetContext.selected_assets.find(
      (item) => item.name === sampleAssetName,
    )?.image_context;
    if (!sampleImageContext) {
      throw new Error(`${label} missing sample image_context for ${sampleAssetName}`);
    }

    return {
      scenario: label,
      profile,
      content_asset_context: contentAssetContext,
      sample_image_context_v2: {
        asset_name: sampleAssetName,
        image_context: sampleImageContext,
      },
    };
  });

  console.log(
    JSON.stringify(
      {
        city: "beijing",
        total_assets: assets.length,
        scenarios: results,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Content asset context test failed: ${message}`);
  process.exitCode = 1;
});
