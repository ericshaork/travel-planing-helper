const fs = require("node:fs/promises");
const path = require("node:path");

const { compileInventorySelection } = require("./compile_inventory_selection");

const CASES = [
  {
    city: "beijing",
    templatePath: path.join("templates", "examples", "beijing_couple_template.json"),
    inventoryPath: path.join("inventories", "beijing.city_inventory.json"),
    goldenPackagePath: path.join("trip_packages", "beijing_couple_golden_v2"),
    requiredCoreAssets: [
      "ca_beijing_forbidden_city",
      "ca_beijing_jingshan_park",
      "ca_beijing_beihai_park",
      "ca_beijing_liangma_river",
    ],
  },
  {
    city: "hangzhou",
    templatePath: path.join("templates", "examples", "hangzhou_couple_template.json"),
    inventoryPath: path.join("inventories", "hangzhou.city_inventory.json"),
    goldenPackagePath: path.join("trip_packages", "hangzhou_couple_golden_v1"),
    requiredCoreAssets: [
      "ca_hangzhou_west_lake",
      "ca_hangzhou_longjing_tea_fields",
      "ca_hangzhou_su_causeway",
      "ca_hangzhou_lakeside_evening",
      "ca_hangzhou_xiaohe_straight_street",
    ],
  },
  {
    city: "chengdu",
    templatePath: path.join("templates", "examples", "chengdu_couple_template.json"),
    inventoryPath: path.join("inventories", "chengdu.city_inventory.json"),
    goldenPackagePath: path.join("trip_packages", "chengdu_couple_golden_v1"),
    requiredCoreAssets: [
      "ca_chengdu_taikoo_li",
      "ca_chengdu_city_mood",
      "ca_chengdu_chuanchuan_snacks",
      "ca_chengdu_wangping_street",
    ],
  },
];

const expectedStrategyByProfile = {
  cover: ["hybrid", "ai_generated"],
  place: ["real_photo"],
  food: ["real_photo"],
  experience: ["hybrid"],
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function getGoldenAssets(packageManifest) {
  const byAssetId = new Map();

  for (const asset of packageManifest.images?.assets || []) {
    const group = byAssetId.get(asset.asset_id) || [];
    group.push(asset);
    byAssetId.set(asset.asset_id, group);
  }

  return byAssetId;
}

function buildMatchedAssets(requiredCoreAssets, selectedAssets, goldenAssetsById) {
  const selectedIds = new Set(selectedAssets.map((asset) => asset.asset_id));

  return requiredCoreAssets
    .filter((assetId) => selectedIds.has(assetId))
    .map((assetId) => ({
      asset_id: assetId,
      selected_asset_name: selectedAssets.find((asset) => asset.asset_id === assetId)?.asset_name || "",
      golden_asset_instance_ids: (goldenAssetsById.get(assetId) || []).map((asset) => asset.asset_instance_id),
    }));
}

function buildMissingAssets(requiredCoreAssets, selectedAssets, goldenAssetsById) {
  const selectedIds = new Set(selectedAssets.map((asset) => asset.asset_id));

  return requiredCoreAssets
    .filter((assetId) => !selectedIds.has(assetId))
    .map((assetId) => ({
      asset_id: assetId,
      golden_asset_instance_ids: (goldenAssetsById.get(assetId) || []).map((asset) => asset.asset_instance_id),
      reason: "Required Golden core asset was not selected by Inventory Compiler.",
    }));
}

function buildStrategyMismatches(selectedAssets) {
  return selectedAssets.flatMap((asset) => {
    const profile = asset.image_context?.image_usage_profile;
    const mode = asset.image_context?.default_generation_mode;
    const allowedModes = expectedStrategyByProfile[profile] || [];

    if (allowedModes.includes(mode)) return [];

    return [
      {
        asset_id: asset.asset_id,
        asset_name: asset.asset_name,
        image_usage_profile: profile,
        default_generation_mode: mode,
        expected_generation_modes: allowedModes,
      },
    ];
  });
}

async function runCase(rootDir, testCase) {
  const compileResult = await compileInventorySelection({
    rootDir,
    templatePath: testCase.templatePath,
    inventoryPath: testCase.inventoryPath,
  });
  const packageManifest = await readJson(path.join(rootDir, testCase.goldenPackagePath, "package_manifest.json"));
  const goldenAssetsById = getGoldenAssets(packageManifest);
  const selectedAssets = compileResult.selectedAssets.selected_assets;
  const matchedAssets = buildMatchedAssets(testCase.requiredCoreAssets, selectedAssets, goldenAssetsById);
  const missingGoldenAssets = buildMissingAssets(testCase.requiredCoreAssets, selectedAssets, goldenAssetsById);
  const strategyMismatch = buildStrategyMismatches(selectedAssets);
  const warnings = [
    ...compileResult.report.warnings,
    ...compileResult.report.unmatched_requirements.map(
      (item) => `Unmatched template family ${item.family}: required ${item.required}, selected ${item.selected}.`,
    ),
  ];
  const status = missingGoldenAssets.length === 0 && strategyMismatch.length === 0 ? "passed" : "failed";
  const outDir = path.join(rootDir, "output", "inventory_regression_runs", testCase.city);

  const selectedPayload = {
    ...compileResult.selectedAssets,
    regression_source: {
      golden_package_path: testCase.goldenPackagePath,
      required_core_assets: testCase.requiredCoreAssets,
    },
  };
  const regressionReport = {
    regression_version: "golden_city_inventory_regression_v1",
    mode: "asset_selection_regression_only",
    generated_on: new Date().toISOString(),
    city: testCase.city,
    status,
    source_template_path: testCase.templatePath,
    source_inventory_path: testCase.inventoryPath,
    golden_package_path: testCase.goldenPackagePath,
    output_dir: normalizePath(rootDir, outDir),
    total_selected_assets: selectedAssets.length,
    required_core_assets: testCase.requiredCoreAssets,
    matched_assets: matchedAssets,
    missing_golden_assets: missingGoldenAssets,
    strategy_mismatch: strategyMismatch,
    warnings,
    inventory_compile_summary: {
      total_assets: compileResult.report.total_assets,
      selected_assets: compileResult.report.selected_assets,
      selected_by_category: compileResult.report.selected_by_category,
      selected_by_family: compileResult.report.selected_by_family,
      unmatched_requirements: compileResult.report.unmatched_requirements,
    },
    boundaries: {
      generated_travel_content: false,
      called_llm: false,
      generated_images: false,
      ran_image_pipeline: false,
      packaged_trip: false,
      modified_content_pipeline: false,
      modified_image_pipeline: false,
      modified_trip_package_builder: false,
      modified_template_schema: false,
      modified_inventory_schema: false,
    },
  };

  await writeJson(path.join(outDir, "selected_assets.json"), selectedPayload);
  await writeJson(path.join(outDir, "regression_report.json"), regressionReport);

  return regressionReport;
}

async function main() {
  const rootDir = process.cwd();
  const reports = [];

  for (const testCase of CASES) {
    reports.push(await runCase(rootDir, testCase));
  }

  console.log("Golden City Inventory regression completed:");
  for (const report of reports) {
    console.log(
      `- ${report.city}: ${report.status}, matched=${report.matched_assets.length}/${report.required_core_assets.length}, strategy_mismatch=${report.strategy_mismatch.length}, warnings=${report.warnings.length}`,
    );
  }

  process.exitCode = reports.every((report) => report.status === "passed") ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
