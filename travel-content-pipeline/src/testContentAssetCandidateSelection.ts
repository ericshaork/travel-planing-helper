import {
  loadAssetsWithDiagnostics,
  rankAssets,
  selectCandidates,
  type CandidateSelectionRequest,
} from "./contentAsset/index.js";

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
      expectedSummaryRoles: ["slow_walk_anchor", "browse_asset", "reflection_space", "historic_texture"],
    },
  ];

  const results = scenarios.map(({ label, profile, expectedAssetIds, expectedSummaryRoles }) => {
    const ranked = rankAssets(profile, assets);
    const selection = selectCandidates(profile, ranked);
    const selectedAssetIds = selection.selected.map((item) => item.asset.id);

    assertIncludesAll(selectedAssetIds, expectedAssetIds, label);
    assertSummaryIncludesRoles(selection.summary.roles, expectedSummaryRoles, label);

    if (selection.selected.some((item) => item.reasons.length === 0)) {
      throw new Error(`${label} contains a selected asset without selection reasons`);
    }

    if (
      selection.selected.some(
        (item) =>
          !item.image_context.required ||
          item.image_context.images.length === 0 ||
          item.image_context.images.some(
            (image) =>
              !image.type ||
              !image.purpose ||
              !image.prompt ||
              !image.status ||
              image.status !== "pending",
          ),
      )
    ) {
      throw new Error(`${label} contains a selected asset without valid image_context`);
    }

    return {
      scenario: label,
      profile,
      target_asset_count: selection.target_asset_count,
      selected: selection.selected.map((item) => ({
        id: item.asset.id,
        name: item.asset.name,
        family: item.family,
        ranking_score: item.ranking_score,
        selection_score: item.selection_score,
        connected_asset_ids: item.connected_asset_ids,
        reasons: item.reasons,
        image_context: item.image_context,
      })),
      summary: selection.summary,
      next_best_rejected: selection.rejected.slice(0, 3).map((item) => ({
        id: item.asset.id,
        name: item.asset.name,
        family: item.family,
        selection_score: item.selection_score,
      })),
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
  console.error(`Content asset candidate selection test failed: ${message}`);
  process.exitCode = 1;
});
