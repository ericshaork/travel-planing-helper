const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_TEMPLATE_PATH = path.join("templates", "examples", "hangzhou_couple_template.json");
const DEFAULT_INVENTORY_PATH = path.join("inventories", "hangzhou.city_inventory.json");

function parseArgs(argv) {
  const args = {
    templatePath: DEFAULT_TEMPLATE_PATH,
    inventoryPath: DEFAULT_INVENTORY_PATH,
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--template" && next) {
      args.templatePath = next;
      index += 1;
    } else if (arg === "--inventory" && next) {
      args.inventoryPath = next;
      index += 1;
    } else if (arg === "--root-dir" && next) {
      args.rootDir = next;
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

function normalizePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function scoreAsset(asset, family, travelerType) {
  let score = 0;

  if (asset.asset_family === family) score += 1000;
  if ((asset.traveler_fit || []).includes(travelerType)) score += 100;
  score += Math.max(0, 100 - asset.priority);

  return score;
}

function sortForFamily(assets, family, travelerType) {
  return [...assets].sort((left, right) => {
    const scoreDiff = scoreAsset(right, family, travelerType) - scoreAsset(left, family, travelerType);
    if (scoreDiff !== 0) return scoreDiff;
    return left.priority - right.priority;
  });
}

function toSelectedAsset(asset, selectionReason) {
  return {
    asset_id: asset.asset_id,
    asset_name: asset.asset_name,
    asset_category: asset.asset_category,
    asset_family: asset.asset_family,
    route_role: asset.route_role,
    priority: asset.priority,
    selection_reason: selectionReason,
    image_context: asset.image_context,
    review_rules: asset.review_rules,
    golden_reference: asset.golden_reference,
  };
}

function countByCategory(selectedAssets) {
  return selectedAssets.reduce((counts, asset) => {
    counts[asset.asset_category] = (counts[asset.asset_category] || 0) + 1;
    return counts;
  }, {});
}

function selectRequiredAssets(template, inventory) {
  const travelerType = template.traveler_profile?.traveler_type;
  const selected = [];
  const selectedIds = new Set();
  const unmatchedRequirements = [];

  for (const requirement of template.asset_requirements?.families || []) {
    const family = requirement.family;
    const minimumCount = requirement.minimum_count || 0;

    if (minimumCount === 0) continue;

    const candidates = inventory.assets.filter(
      (asset) => asset.asset_family === family && (asset.traveler_fit || []).includes(travelerType),
    );
    const fallbackCandidates = inventory.assets.filter((asset) => asset.asset_family === family);
    const rankedCandidates = sortForFamily(candidates.length ? candidates : fallbackCandidates, family, travelerType);
    const picked = [];

    for (const asset of rankedCandidates) {
      if (picked.length >= minimumCount) break;
      if (selectedIds.has(asset.asset_id)) continue;

      selected.push(toSelectedAsset(asset, `required_family:${family}`));
      selectedIds.add(asset.asset_id);
      picked.push(asset);
    }

    if (picked.length < minimumCount) {
      unmatchedRequirements.push({
        family,
        required: minimumCount,
        selected: picked.length,
        purpose: requirement.purpose,
        reason: `Only found ${picked.length} matching assets for ${family}.`,
      });
    }
  }

  return { selected, selectedIds, unmatchedRequirements };
}

function addSupplementalAssets(template, inventory, selected, selectedIds) {
  const travelerType = template.traveler_profile?.traveler_type;
  const warnings = [];
  const minimumMix = inventory.compiler_hints?.minimum_asset_mix || {};
  const selectedAssets = [...selected];
  const counts = countByCategory(selectedAssets);

  for (const [category, minimumCount] of Object.entries(minimumMix)) {
    const currentCount = counts[category] || 0;
    const needed = Math.max(0, minimumCount - currentCount);

    if (needed === 0) continue;

    const rankedCandidates = [...inventory.assets]
      .filter((asset) => asset.asset_category === category && !selectedIds.has(asset.asset_id))
      .sort((left, right) => {
        const leftTraveler = (left.traveler_fit || []).includes(travelerType) ? 1 : 0;
        const rightTraveler = (right.traveler_fit || []).includes(travelerType) ? 1 : 0;
        if (rightTraveler !== leftTraveler) return rightTraveler - leftTraveler;
        return left.priority - right.priority;
      });

    let added = 0;
    for (const asset of rankedCandidates) {
      if (added >= needed) break;
      selectedAssets.push(toSelectedAsset(asset, `supplemental_minimum_mix:${category}`));
      selectedIds.add(asset.asset_id);
      counts[category] = (counts[category] || 0) + 1;
      added += 1;
    }

    if (added < needed) {
      warnings.push(`Inventory minimum mix requested ${minimumCount} ${category} assets, selected ${currentCount + added}.`);
    }
  }

  return { selectedAssets, warnings };
}

function validateInputs(template, inventory) {
  const warnings = [];

  if (template.city_identity?.code !== inventory.city?.code) {
    warnings.push(
      `Template city ${template.city_identity?.code || "unknown"} does not match inventory city ${
        inventory.city?.code || "unknown"
      }.`,
    );
  }

  const templateFamilies = new Set((template.asset_requirements?.families || []).map((item) => item.family));
  const inventoryFamilies = new Set((inventory.assets || []).map((asset) => asset.asset_family));

  for (const family of templateFamilies) {
    if (!inventoryFamilies.has(family)) {
      warnings.push(`No inventory asset exists for required family ${family}.`);
    }
  }

  return warnings;
}

async function compileInventorySelection(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const templatePath = path.resolve(rootDir, options.templatePath || DEFAULT_TEMPLATE_PATH);
  const inventoryPath = path.resolve(rootDir, options.inventoryPath || DEFAULT_INVENTORY_PATH);
  const template = await readJson(templatePath);
  const inventory = await readJson(inventoryPath);
  const cityCode = inventory.city?.code || template.city_identity?.code || "unknown_city";
  const outputDir = path.join(rootDir, "output", "inventory_compile_runs", cityCode);

  const inputWarnings = validateInputs(template, inventory);
  const { selected, selectedIds, unmatchedRequirements } = selectRequiredAssets(template, inventory);
  const { selectedAssets, warnings: supplementalWarnings } = addSupplementalAssets(
    template,
    inventory,
    selected,
    selectedIds,
  );
  const warnings = [...inputWarnings, ...supplementalWarnings];

  const selectedAssetsPayload = {
    compiler_version: "inventory_selection_compiler_v1",
    mode: "asset_selection_only",
    generated_on: new Date().toISOString(),
    city: inventory.city,
    source_template_path: normalizePath(rootDir, templatePath),
    source_inventory_path: normalizePath(rootDir, inventoryPath),
    traveler_profile: template.traveler_profile,
    selected_assets: selectedAssets,
  };

  const report = {
    compiler_version: "inventory_selection_compiler_v1",
    mode: "asset_selection_only",
    generated_on: selectedAssetsPayload.generated_on,
    city: inventory.city,
    source_template_path: normalizePath(rootDir, templatePath),
    source_inventory_path: normalizePath(rootDir, inventoryPath),
    output_dir: normalizePath(rootDir, outputDir),
    total_assets: inventory.assets.length,
    selected_assets: selectedAssets.length,
    selected_by_category: countByCategory(selectedAssets),
    selected_by_family: selectedAssets.reduce((counts, asset) => {
      counts[asset.asset_family] = (counts[asset.asset_family] || 0) + 1;
      return counts;
    }, {}),
    unmatched_requirements: unmatchedRequirements,
    warnings,
    boundaries: {
      generated_travel_content: false,
      called_llm: false,
      generated_images: false,
      ran_image_pipeline: false,
      modified_content_pipeline: false,
      modified_image_pipeline: false,
      modified_image_manifest_schema: false,
      modified_trip_package_builder: false,
    },
  };

  await writeJson(path.join(outputDir, "selected_assets.json"), selectedAssetsPayload);
  await writeJson(path.join(outputDir, "inventory_compile_report.json"), report);

  return { outputDir, selectedAssets: selectedAssetsPayload, report };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await compileInventorySelection(args);

  console.log("Inventory selection compile completed:");
  console.log(`- city: ${result.report.city.code}`);
  console.log(`- output: ${result.outputDir}`);
  console.log(`- total_assets: ${result.report.total_assets}`);
  console.log(`- selected_assets: ${result.report.selected_assets}`);
  console.log(`- unmatched_requirements: ${result.report.unmatched_requirements.length}`);
  console.log(`- warnings: ${result.report.warnings.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  compileInventorySelection,
};
