const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { compileInventorySelection } = require("./compile_inventory_selection");
const { compileTemplateDryRun } = require("./compile_template_dry_run");

const DEFAULT_CITIES = ["beijing", "hangzhou", "chengdu", "shanghai", "xian"];

function parseArgs(argv) {
  const args = {
    cities: DEFAULT_CITIES,
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--cities" && next) {
      args.cities = next.split(",").map((city) => city.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--root-dir" && next) {
      args.rootDir = path.resolve(next);
      index += 1;
    }
  }

  return args;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function exists(filePath) {
  return fsSync.existsSync(filePath);
}

function toRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function countImageStrategies(compiledImageRequest) {
  const slotPlans = (compiledImageRequest.family_slot_strategy || []).flatMap((family) => family.slot_plan || []);
  return {
    total_slots: slotPlans.length,
    by_generation_mode: slotPlans.reduce((counts, slot) => {
      counts[slot.generation_mode] = (counts[slot.generation_mode] || 0) + 1;
      return counts;
    }, {}),
    by_usage_profile: slotPlans.reduce((counts, slot) => {
      counts[slot.image_usage_profile] = (counts[slot.image_usage_profile] || 0) + 1;
      return counts;
    }, {}),
  };
}

async function loadContentAssetsWithPipelineLoader(rootDir, city) {
  const contentRoot = path.resolve(rootDir, "travel-content-pipeline");
  const modulePath = path.resolve(contentRoot, "dist", "contentAsset", "index.js");

  if (!exists(modulePath)) {
    return {
      status: "failed",
      asset_count: 0,
      errors: [`Missing compiled Content Pipeline module: ${toRelative(rootDir, modulePath)}`],
    };
  }

  const previousCwd = process.cwd();

  try {
    process.chdir(contentRoot);
    const moduleUrl = pathToFileURL(modulePath).href;
    const contentAssetModule = await import(`${moduleUrl}?dry_run=${Date.now()}_${city}`);
    const result = await contentAssetModule.loadAssetsWithDiagnostics(city);

    return {
      status: result.errors.length === 0 ? "passed" : "failed",
      asset_count: result.assets.length,
      errors: result.errors,
    };
  } catch (error) {
    return {
      status: "failed",
      asset_count: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  } finally {
    process.chdir(previousCwd);
  }
}

async function runCityDryRun(rootDir, city) {
  const templatePath = path.resolve(rootDir, "templates", "examples", `${city}_couple_template.json`);
  const inventoryPath = path.resolve(rootDir, "inventories", `${city}.city_inventory.json`);
  const contentAssetsDir = path.resolve(rootDir, "travel-content-pipeline", "input", "content_assets_v1", city);
  const outputDir = path.resolve(rootDir, "output", "multi_city_dry_runs", city);
  const warnings = [];
  const issues = [];

  const templateStatus = {
    status: exists(templatePath) ? "passed" : "failed",
    path: toRelative(rootDir, templatePath),
  };
  const inventoryStatus = {
    status: exists(inventoryPath) ? "passed" : "failed",
    path: toRelative(rootDir, inventoryPath),
  };

  if (templateStatus.status !== "passed") issues.push(`Missing template: ${templateStatus.path}`);
  if (inventoryStatus.status !== "passed") issues.push(`Missing inventory: ${inventoryStatus.path}`);

  const contentAssetsStatus = exists(contentAssetsDir)
    ? await loadContentAssetsWithPipelineLoader(rootDir, city)
    : {
        status: "failed",
        asset_count: 0,
        errors: [`Missing content assets directory: ${toRelative(rootDir, contentAssetsDir)}`],
      };

  if (contentAssetsStatus.status !== "passed") {
    issues.push(`Content assets failed for ${city}: ${contentAssetsStatus.errors.join(" | ")}`);
  }

  let inventorySelectionStatus = {
    status: "skipped",
    selected_asset_count: 0,
    unmatched_requirements: [],
    warnings: [],
  };
  let imageStrategyStatus = {
    status: "skipped",
    image_strategy_count: {
      total_slots: 0,
      by_generation_mode: {},
      by_usage_profile: {},
    },
    warnings: [],
  };

  if (templateStatus.status === "passed" && inventoryStatus.status === "passed") {
    try {
      const inventoryResult = await compileInventorySelection({
        rootDir,
        templatePath: toRelative(rootDir, templatePath),
        inventoryPath: toRelative(rootDir, inventoryPath),
      });
      inventorySelectionStatus = {
        status:
          inventoryResult.report.unmatched_requirements.length === 0 && inventoryResult.report.warnings.length === 0
            ? "passed"
            : "warning",
        selected_asset_count: inventoryResult.report.selected_assets,
        unmatched_requirements: inventoryResult.report.unmatched_requirements,
        warnings: inventoryResult.report.warnings,
        output_dir: toRelative(rootDir, inventoryResult.outputDir),
      };
      warnings.push(...inventoryResult.report.warnings);
      if (inventoryResult.report.unmatched_requirements.length > 0) {
        issues.push(`Inventory selection has unmatched requirements for ${city}.`);
      }
    } catch (error) {
      inventorySelectionStatus = {
        ...inventorySelectionStatus,
        status: "failed",
        warnings: [error instanceof Error ? error.message : String(error)],
      };
      issues.push(`Inventory selection failed for ${city}.`);
    }

    try {
      const templateResult = await compileTemplateDryRun({
        rootDir,
        runId: `${city}_couple_v1`,
        templatePath: toRelative(rootDir, templatePath),
      });
      imageStrategyStatus = {
        status: templateResult.compileReport.status,
        image_strategy_count: countImageStrategies(templateResult.compiledImageRequest),
        planned_minimum_images: templateResult.compiledImageRequest.planned_minimum_images,
        warnings: templateResult.compileReport.validation.warnings || [],
        output_dir: toRelative(rootDir, templateResult.outputDir),
      };
      warnings.push(...imageStrategyStatus.warnings);
      if (templateResult.compileReport.status !== "passed") {
        issues.push(`Image strategy compile failed for ${city}.`);
      }
    } catch (error) {
      imageStrategyStatus = {
        ...imageStrategyStatus,
        status: "failed",
        warnings: [error instanceof Error ? error.message : String(error)],
      };
      issues.push(`Image strategy compile failed for ${city}.`);
    }
  }

  const report = {
    dry_run_version: "multi_city_orchestration_dry_run_v1",
    mode: "orchestration_readiness_only",
    generated_on: new Date().toISOString(),
    city,
    status: issues.length === 0 ? "passed" : "failed",
    template_status: templateStatus,
    inventory_status: inventoryStatus,
    content_assets_status: contentAssetsStatus,
    selected_asset_count: inventorySelectionStatus.selected_asset_count,
    inventory_selection_status: inventorySelectionStatus,
    image_strategy_count: imageStrategyStatus.image_strategy_count,
    image_strategy_status: imageStrategyStatus,
    warnings,
    issues,
    boundaries: {
      generated_travel_content: false,
      called_llm: false,
      generated_images: false,
      ran_image_pipeline: false,
      created_trip_package: false,
      modified_content_pipeline_core: false,
      modified_image_pipeline: false,
      modified_trip_package_builder: false,
      modified_template_schema: false,
      modified_inventory_schema: false,
    },
  };

  await writeJson(path.resolve(outputDir, "dry_run_report.json"), report);

  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.rootDir);
  const reports = [];

  for (const city of args.cities) {
    reports.push(await runCityDryRun(rootDir, city));
  }

  const failed = reports.filter((report) => report.status !== "passed");

  console.log("Multi-city orchestration dry run completed:");
  for (const report of reports) {
    console.log(
      `- ${report.city}: ${report.status}, content_assets=${report.content_assets_status.asset_count}, selected_assets=${report.selected_asset_count}, image_slots=${report.image_strategy_count.total_slots}, warnings=${report.warnings.length}`,
    );
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  runCityDryRun,
};
