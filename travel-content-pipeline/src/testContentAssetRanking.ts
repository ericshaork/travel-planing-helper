import {
  loadAssetsWithDiagnostics,
  rankAssets,
  type AssetRequestProfile,
} from "./contentAsset/index.js";

async function main(): Promise<void> {
  const { assets, errors } = await loadAssetsWithDiagnostics("beijing");

  if (errors.length > 0) {
    throw new Error(`Content asset loading failed:\n${errors.join("\n")}`);
  }

  const scenarios: Array<{ label: string; profile: AssetRequestProfile }> = [
    {
      label: "couple_first_visit_autumn",
      profile: {
        traveler: "couple",
        season: "autumn",
        purpose: "first_visit",
      },
    },
    {
      label: "student_food_exploration_winter",
      profile: {
        traveler: "student",
        season: "winter",
        purpose: "food_exploration",
      },
    },
    {
      label: "solo_deep_exploration_spring",
      profile: {
        traveler: "solo",
        season: "spring",
        purpose: "deep_exploration",
      },
    },
  ];

  const results = scenarios.map(({ label, profile }) => ({
    scenario: label,
    profile,
    top_assets: rankAssets(profile, assets).slice(0, 5).map((item) => ({
      id: item.asset.id,
      name: item.asset.name,
      score: item.score,
      reasons: item.reasons,
      breakdown: item.breakdown,
    })),
  }));

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
  console.error(`Content asset ranking test failed: ${message}`);
  process.exitCode = 1;
});
