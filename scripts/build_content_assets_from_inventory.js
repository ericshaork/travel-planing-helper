const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_CITY = "shanghai";

function parseArgs(argv) {
  const args = {
    city: DEFAULT_CITY,
    inventoryPath: null,
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--city" && next) {
      args.city = next;
      index += 1;
    } else if (arg === "--inventory" && next) {
      args.inventoryPath = next;
      index += 1;
    } else if (arg === "--root-dir" && next) {
      args.rootDir = path.resolve(next);
      index += 1;
    }
  }

  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function slugify(value, fallback = "asset") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/^ca_[a-z0-9]+_/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function toTravelerFit(travelerFit) {
  const travelers = ["couple", "student", "solo", "family", "friends"];
  const fitSet = new Set(Array.isArray(travelerFit) ? travelerFit : []);

  return Object.fromEntries(
    travelers.map((traveler) => {
      if (fitSet.has(traveler)) return [traveler, "high"];
      if (traveler === "student" && fitSet.has("friends")) return [traveler, "medium"];
      return [traveler, "none"];
    }),
  );
}

function toSeasonFit(cityIdentity) {
  const primarySeason = cityIdentity?.seasonal_texture?.primary_season || "autumn";
  const seasons = ["spring", "summer", "autumn", "winter"];

  return Object.fromEntries(seasons.map((season) => [season, season === primarySeason ? "high" : "medium"]));
}

function toContentRole(asset) {
  return unique([
    asset.asset_family,
    asset.route_role,
    asset.asset_category,
    asset.image_context?.image_usage_profile,
    asset.image_context?.default_generation_mode,
  ]);
}

function toCategory(asset) {
  return unique([
    asset.asset_category,
    asset.asset_family,
    asset.route_role,
  ]);
}

function toExperienceValue(asset) {
  const mainSubject = asset.image_context?.visual_subject?.main_subject;
  const positiveCues = Array.isArray(asset.image_context?.positive_cues) ? asset.image_context.positive_cues : [];

  return {
    primary: unique([asset.asset_family, asset.route_role, asset.asset_category, ...positiveCues.slice(0, 4)]),
    summary: mainSubject || `${asset.asset_name} supports the ${asset.asset_family} route role.`,
  };
}

function validateBridgeAsset(sourceAsset, bridgeAsset) {
  const missing = [];

  for (const field of [
    "id",
    "name",
    "asset_type",
    "category",
    "content_role",
    "traveler_fit",
    "season_fit",
    "experience_value",
  ]) {
    if (bridgeAsset[field] === undefined || bridgeAsset[field] === null) {
      missing.push(`${sourceAsset.asset_id}.${field}`);
    }
  }

  for (const field of ["asset_id", "asset_name", "asset_category", "asset_family", "route_role", "traveler_fit", "image_context"]) {
    if (sourceAsset[field] === undefined || sourceAsset[field] === null) {
      missing.push(`${sourceAsset.asset_id || "unknown_inventory_asset"}.${field}`);
    }
  }

  return missing;
}

function buildContentAsset(sourceAsset, inventory) {
  const imageContext = sourceAsset.image_context || {};
  const searchKeywords = unique([
    ...(Array.isArray(imageContext.search_keywords) ? imageContext.search_keywords : []),
    ...(Array.isArray(sourceAsset.search_keywords) ? sourceAsset.search_keywords : []),
  ]);

  return {
    id: sourceAsset.asset_id,
    name: sourceAsset.asset_name,
    asset_type: `${sourceAsset.asset_category}_${sourceAsset.asset_family}`,
    category: toCategory(sourceAsset),
    content_role: toContentRole(sourceAsset),
    traveler_fit: toTravelerFit(sourceAsset.traveler_fit),
    season_fit: toSeasonFit(inventory.city_identity),
    best_time: {
      time_of_day: Array.isArray(sourceAsset.time_of_day) ? sourceAsset.time_of_day : [],
      note: `${sourceAsset.asset_name} is intended as ${sourceAsset.route_role} with ${sourceAsset.pace_hint || "balanced"} pacing.`,
    },
    experience_value: toExperienceValue(sourceAsset),
    avoid_when: Array.isArray(imageContext.negative_cues) ? imageContext.negative_cues : [],
    nearby_assets: [],
    map_asset_id: `poi_${slugify(sourceAsset.asset_id)}`,
    bridge_metadata: {
      source: "city_inventory",
      source_inventory_id: inventory.inventory_id,
      asset_id: sourceAsset.asset_id,
      asset_name: sourceAsset.asset_name,
      asset_category: sourceAsset.asset_category,
      asset_family: sourceAsset.asset_family,
      route_role: sourceAsset.route_role,
      why_it_matters: imageContext.visual_subject?.main_subject || sourceAsset.review_rules?.identity_check?.[0] || "",
      pace_hint: sourceAsset.pace_hint || "",
      priority: sourceAsset.priority,
    },
    image_context: sourceAsset.image_context,
    search_keywords: searchKeywords,
    review_rules: sourceAsset.review_rules,
    golden_reference: sourceAsset.golden_reference,
  };
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

async function buildContentAssetsFromInventory(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const city = options.city || DEFAULT_CITY;
  const inventoryPath = path.resolve(rootDir, options.inventoryPath || path.join("inventories", `${city}.city_inventory.json`));
  const inventory = await readJson(inventoryPath);
  const cityCode = inventory.city?.code || city;
  const outputDir = path.resolve(rootDir, "travel-content-pipeline", "input", "content_assets_v1", cityCode);
  const reportDir = path.resolve(rootDir, "output", "content_asset_bridge_runs", cityCode);
  const missingRequiredFields = [];
  const warnings = [];
  const generatedAssets = [];

  await fs.mkdir(outputDir, { recursive: true });

  for (const sourceAsset of inventory.assets || []) {
    const bridgeAsset = buildContentAsset(sourceAsset, inventory);
    missingRequiredFields.push(...validateBridgeAsset(sourceAsset, bridgeAsset));

    const outputFile = path.resolve(outputDir, `${slugify(sourceAsset.asset_id)}.json`);
    await writeJson(outputFile, bridgeAsset);
    generatedAssets.push({
      asset_id: bridgeAsset.id,
      file_path: path.relative(rootDir, outputFile).replace(/\\/g, "/"),
      asset_category: sourceAsset.asset_category,
      asset_family: sourceAsset.asset_family,
      route_role: sourceAsset.route_role,
    });
  }

  if (generatedAssets.length === 0) {
    warnings.push("No inventory assets were converted.");
  }

  const report = {
    bridge_version: "inventory_to_content_assets_v1",
    mode: "content_asset_bridge_only",
    generated_on: new Date().toISOString(),
    source_inventory: path.relative(rootDir, inventoryPath).replace(/\\/g, "/"),
    output_dir: path.relative(rootDir, outputDir).replace(/\\/g, "/"),
    city: inventory.city,
    generated_assets_count: generatedAssets.length,
    category_counts: countBy(generatedAssets.map((asset) => asset.asset_category)),
    family_counts: countBy(generatedAssets.map((asset) => asset.asset_family)),
    generated_assets: generatedAssets,
    missing_required_fields: unique(missingRequiredFields),
    warnings,
    boundaries: {
      generated_travel_content: false,
      called_llm: false,
      generated_images: false,
      ran_image_pipeline: false,
      modified_content_pipeline_core: false,
      modified_image_pipeline: false,
      modified_trip_package_builder: false,
      modified_template_schema: false,
      modified_inventory_schema: false,
    },
  };

  await writeJson(path.resolve(reportDir, "bridge_report.json"), report);

  return {
    outputDir,
    reportPath: path.resolve(reportDir, "bridge_report.json"),
    report,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildContentAssetsFromInventory(args);

  console.log("Content asset bridge completed:");
  console.log(`- city: ${result.report.city.code}`);
  console.log(`- output_dir: ${result.report.output_dir}`);
  console.log(`- generated_assets_count: ${result.report.generated_assets_count}`);
  console.log(`- missing_required_fields: ${result.report.missing_required_fields.length}`);
  console.log(`- warnings: ${result.report.warnings.length}`);
  console.log(`- bridge_report: ${path.relative(path.resolve(args.rootDir), result.reportPath).replace(/\\/g, "/")}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildContentAssetsFromInventory,
};
