const fs = require("node:fs/promises");
const path = require("node:path");

const HARD_FAIL_CODES = new Set([
  "city_mood_as_poi",
  "food_storefront_only",
  "location_identity_failed",
]);

const CITY_MOOD_ALLOWED_SLOTS = new Set(["explore_cover", "mood_gallery", "day_cover"]);
const FOOD_SUBJECT_TERMS = [
  "food",
  "dish",
  "dining",
  "meal",
  "table",
  "tableware",
  "cuisine",
  "noodle",
  "noodles",
  "bao",
  "dumpling",
  "snack",
  "serving",
  "restaurant table",
  "local flavor",
];
const FOOD_REJECT_TERMS = [
  "storefront only",
  "facade only",
  "empty street",
  "storefront-only",
  "facade-only",
  "shop sign only",
];
const PLACE_IDENTITY_TERMS = [
  "landmark",
  "street",
  "road",
  "tower",
  "park",
  "temple",
  "museum",
  "river",
  "bund",
  "pagoda",
  "wall",
  "lake",
  "garden",
  "alley",
  "district",
  "architecture",
  "skyline",
  "waterfront",
  "promenade",
];

function parseArgs(argv) {
  const args = {
    packagePath: path.join("trip_packages", "shanghai_couple_v1"),
    rootDir: process.cwd(),
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--package" && next) {
      args.packagePath = next;
      index += 1;
    } else if (arg === "--output" && next) {
      args.outputPath = next;
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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function slugifyAssetId(assetId) {
  return String(assetId || "")
    .toLowerCase()
    .replace(/^ca_[a-z0-9]+_/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function asText(...values) {
  return values
    .flatMap((value) => {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "object") return Object.values(value);
      return [value];
    })
    .join(" ")
    .toLowerCase();
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

async function loadContentAsset(rootDir, cityCode, assetId) {
  const cityDir = path.resolve(rootDir, "travel-content-pipeline", "input", "content_assets_v1", cityCode || "");
  const preferredPath = path.resolve(cityDir, `${slugifyAssetId(assetId)}.json`);

  if (await pathExists(preferredPath)) {
    return readJson(preferredPath);
  }

  try {
    const entries = await fs.readdir(cityDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
      const candidate = await readJson(path.resolve(cityDir, entry.name));
      if (candidate.id === assetId || candidate.bridge_metadata?.asset_id === assetId) {
        return candidate;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function resolveAssetCategory(contentAsset) {
  const bridgeCategory = contentAsset?.bridge_metadata?.asset_category;
  if (bridgeCategory) return bridgeCategory;

  const categories = Array.isArray(contentAsset?.category) ? contentAsset.category : [contentAsset?.category].filter(Boolean);
  if (categories.includes("city_mood")) return "city_mood";
  if (categories.includes("food") || categories.includes("food_backbone")) return "food";
  if (categories.includes("experience") || categories.includes("evening_closure")) return "experience";
  return "place";
}

function buildReviewText(image, packageAsset, contentAsset, imageAsset) {
  return asText(
    image.asset_id,
    image.asset_name,
    image.image_slot,
    image.image_usage_profile,
    image.prompt,
    image.decision_reason,
    image.search_keywords,
    image.location_context,
    image.visual_subject,
    contentAsset?.name,
    contentAsset?.category,
    contentAsset?.content_role,
    contentAsset?.experience_value,
    contentAsset?.image_context,
    contentAsset?.search_keywords,
    imageAsset?.metadata?.title,
    imageAsset?.metadata?.description,
    imageAsset?.metadata?.score_reasons,
    packageAsset?.source,
  );
}

function buildOutputEvidenceText(image, packageAsset, imageAsset) {
  return asText(
    image.asset_id,
    image.asset_name,
    image.image_slot,
    image.image_usage_profile,
    image.prompt,
    image.decision_reason,
    image.search_keywords,
    image.location_context,
    image.visual_subject,
    imageAsset?.metadata?.title,
    imageAsset?.metadata?.description,
    imageAsset?.metadata?.score_reasons,
    packageAsset?.source,
  );
}

function addFinding(findings, code, severity, message, details = {}) {
  findings.push({
    code,
    severity,
    hard_fail: HARD_FAIL_CODES.has(code),
    message,
    details,
  });
}

function evaluateCityMoodRules({ image, assetCategory, findings }) {
  if (assetCategory !== "city_mood") return;

  if (image.image_usage_profile === "place") {
    addFinding(
      findings,
      "city_mood_as_poi",
      "error",
      "city_mood assets must not be emitted as image_usage_profile=place.",
      { image_usage_profile: image.image_usage_profile },
    );
  }

  if (image.image_slot === "poi_gallery") {
    addFinding(
      findings,
      "city_mood_as_poi",
      "error",
      "city_mood assets must not use image_slot=poi_gallery.",
      { image_slot: image.image_slot, allowed_slots: [...CITY_MOOD_ALLOWED_SLOTS] },
    );
  }

  if (!CITY_MOOD_ALLOWED_SLOTS.has(image.image_slot)) {
    addFinding(
      findings,
      "city_mood_slot_not_allowed",
      "warning",
      "city_mood assets should use explore_cover, mood_gallery, or day_cover.",
      { image_slot: image.image_slot, allowed_slots: [...CITY_MOOD_ALLOWED_SLOTS] },
    );
  }
}

function evaluateFoodRules({ image, text, findings }) {
  if (image.image_slot !== "food_gallery" && image.image_usage_profile !== "food") return;

  const hasFoodSubject = hasAny(text, FOOD_SUBJECT_TERMS);
  const hasRejectCue = hasAny(text, FOOD_REJECT_TERMS);

  if (!hasFoodSubject) {
    addFinding(
      findings,
      "food_visual_subject_missing",
      "error",
      "food_gallery must include food, dish, or dining visual subject metadata.",
      { checked_terms: FOOD_SUBJECT_TERMS },
    );
  }

  if (hasRejectCue) {
    addFinding(
      findings,
      "food_storefront_only",
      "error",
      "food_gallery must reject storefront-only, facade-only, or empty-street evidence.",
      { rejected_terms: FOOD_REJECT_TERMS },
    );
  }
}

function evaluatePlaceRules({ image, assetCategory, text, findings }) {
  if (image.image_usage_profile !== "place" && image.image_slot !== "poi_gallery") return;

  const poi = image.location_context?.poi;
  const city = image.location_context?.city;
  const keywords = Array.isArray(image.search_keywords) ? image.search_keywords : [];
  const hasConcretePoi = typeof poi === "string" && poi.trim() && !/city mood/i.test(poi);
  const hasSearchIdentity = keywords.length > 0 && keywords.some((keyword) => {
    const normalized = String(keyword).toLowerCase();
    return (city && normalized.includes(String(city).toLowerCase())) || (poi && normalized.includes(String(poi).toLowerCase()));
  });
  const hasPlaceCue = hasAny(text, PLACE_IDENTITY_TERMS);

  if (assetCategory === "city_mood") {
    return;
  }

  if (!hasConcretePoi || !hasSearchIdentity || !hasPlaceCue) {
    addFinding(
      findings,
      "location_identity_failed",
      "error",
      "place/poi_gallery assets must express a concrete location identity.",
      {
        poi,
        has_concrete_poi: Boolean(hasConcretePoi),
        has_search_identity: Boolean(hasSearchIdentity),
        has_place_cue: Boolean(hasPlaceCue),
      },
    );
  }
}

async function validatePackageReviewRules(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const packageDir = path.resolve(rootDir, options.packagePath || path.join("trip_packages", "shanghai_couple_v1"));
  const packageManifest = await readJson(path.resolve(packageDir, "package_manifest.json"));
  const imageManifest = await readJson(path.resolve(packageDir, "content", "image_manifest.json"));
  const cityCode = packageManifest.city?.code || imageManifest.city;
  const manifestByInstanceId = new Map((imageManifest.images || []).map((image) => [image.asset_instance_id, image]));
  const assetResults = [];

  for (const packageAsset of packageManifest.images?.assets || []) {
    const image = manifestByInstanceId.get(packageAsset.asset_instance_id);
    const imageAsset = packageAsset.image_asset_path
      ? await readJson(path.resolve(packageDir, packageAsset.image_asset_path))
      : null;
    const contentAsset = image ? await loadContentAsset(rootDir, cityCode, image.asset_id) : null;
    const assetCategory = resolveAssetCategory(contentAsset);
    const findings = [];
    const text = buildReviewText(image || {}, packageAsset, contentAsset, imageAsset);
    const outputEvidenceText = buildOutputEvidenceText(image || {}, packageAsset, imageAsset);

    if (!image) {
      addFinding(findings, "image_manifest_record_missing", "error", "Package image asset is missing from content image_manifest.");
    } else {
      evaluateCityMoodRules({ image, assetCategory, findings });
      evaluateFoodRules({ image, text: outputEvidenceText, findings });
      evaluatePlaceRules({ image, assetCategory, text, findings });
    }

    assetResults.push({
      asset_instance_id: packageAsset.asset_instance_id,
      asset_id: image?.asset_id || packageAsset.asset_id,
      asset_name: image?.asset_name || packageAsset.asset_name,
      asset_category: assetCategory,
      image_slot: image?.image_slot || packageAsset.image_slot,
      image_usage_profile: image?.image_usage_profile || packageAsset.image_usage_profile,
      generation_mode: image?.generation_mode || packageAsset.generation_mode,
      final_source: packageAsset.source,
      status: findings.some((finding) => finding.hard_fail) ? "failed" : findings.length > 0 ? "warning" : "passed",
      findings,
    });
  }

  const hardFailures = assetResults.flatMap((asset) =>
    asset.findings.filter((finding) => finding.hard_fail).map((finding) => ({
      asset_instance_id: asset.asset_instance_id,
      code: finding.code,
      message: finding.message,
    })),
  );
  const warnings = assetResults.flatMap((asset) =>
    asset.findings.filter((finding) => !finding.hard_fail).map((finding) => ({
      asset_instance_id: asset.asset_instance_id,
      code: finding.code,
      message: finding.message,
    })),
  );

  return {
    validator_version: "asset_review_rules_v1",
    generated_on: new Date().toISOString(),
    package_path: toRelative(rootDir, packageDir),
    city: cityCode,
    status: hardFailures.length === 0 ? "passed" : "failed",
    hard_fail_conditions: [...HARD_FAIL_CODES],
    checks: {
      city_mood_usage_restricted: true,
      food_gallery_subject_required: true,
      place_gallery_location_identity_required: true,
    },
    counts: {
      assets_checked: assetResults.length,
      passed_assets: assetResults.filter((asset) => asset.status === "passed").length,
      warning_assets: assetResults.filter((asset) => asset.status === "warning").length,
      failed_assets: assetResults.filter((asset) => asset.status === "failed").length,
      hard_failures: hardFailures.length,
      warnings: warnings.length,
    },
    hard_failures: hardFailures,
    warnings,
    assets: assetResults,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.rootDir);
  const report = await validatePackageReviewRules({
    rootDir,
    packagePath: args.packagePath,
  });
  const outputPath = path.resolve(
    rootDir,
    args.outputPath || path.join("output", "asset_review_rule_runs", path.basename(path.resolve(rootDir, args.packagePath)), "asset_review_rules_report.json"),
  );

  await writeJson(outputPath, report);

  console.log("Asset review rule validation completed:");
  console.log(`- package: ${report.package_path}`);
  console.log(`- status: ${report.status}`);
  console.log(`- assets_checked: ${report.counts.assets_checked}`);
  console.log(`- hard_failures: ${report.counts.hard_failures}`);
  console.log(`- warnings: ${report.counts.warnings}`);
  console.log(`- report: ${toRelative(rootDir, outputPath)}`);

  if (report.status !== "passed") {
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
  validatePackageReviewRules,
};
