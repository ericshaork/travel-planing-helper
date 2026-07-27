const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const { validatePackageReviewRules } = require("./validate_asset_review_rules");

const DEFAULT_CASES = [
  { city: "beijing", packagePath: path.join("trip_packages", "beijing_couple_golden_v2") },
  { city: "hangzhou", packagePath: path.join("trip_packages", "hangzhou_couple_golden_v1") },
  { city: "chengdu", packagePath: path.join("trip_packages", "chengdu_couple_golden_v1") },
  { city: "shanghai", packagePath: path.join("trip_packages", "shanghai_couple_v1") },
  { city: "xian", packagePath: path.join("trip_packages", "xian_couple_v1") },
];

function parseArgs(argv) {
  const args = {
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--root-dir" && next) {
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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function expectedModesForProfile(profile) {
  if (profile === "food") return ["real_photo"];
  if (profile === "place") return ["real_photo"];
  if (profile === "experience") return ["hybrid"];
  if (profile === "cover") return ["hybrid", "ai_generated", "real_photo"];
  return [];
}

function expectedProfilesForSlot(slot) {
  const map = {
    explore_cover: ["cover"],
    trip_cover: ["cover"],
    mood_gallery: ["cover", "experience"],
    day_cover: ["experience", "cover"],
    poi_gallery: ["place"],
    food_gallery: ["food"],
    detail_image: ["place"],
  };

  return map[slot] || [];
}

function checkProvenance(packageAsset, imageAsset) {
  const metadata = imageAsset.metadata || {};
  const source = packageAsset.source || imageAsset.source;
  const mode = packageAsset.generation_mode;
  const missing = [];
  const isRealPhotoSource = ["wikimedia", "pexels"].includes(source);

  if ((mode === "real_photo" || isRealPhotoSource) && source !== "ai_generated") {
    for (const field of ["license", "source_url", "image_url"]) {
      if (!metadata[field]) missing.push(field);
    }
    if (!(metadata.source_runs || source)) missing.push("source");
  }

  if (mode === "ai_generated" || source === "ai_generated") {
    for (const field of ["provider_id", "model_id", "provider_job_id", "prompt"]) {
      if (!metadata[field]) missing.push(field);
    }
  }

  if ((mode === "hybrid" || source === "hybrid") && source !== "ai_generated" && !isRealPhotoSource) {
    if (!metadata.strategy) missing.push("strategy");
    if (!Object.prototype.hasOwnProperty.call(metadata, "real_photo")) missing.push("real_photo");
    if (!Object.prototype.hasOwnProperty.call(metadata, "ai_fallback")) missing.push("ai_fallback");

    const realPhotoMetadata = metadata.real_photo?.metadata || {};
    const aiFallbackMetadata = metadata.ai_fallback?.metadata || {};
    const resolvedVia = metadata.resolved_via || "";

    if (metadata.real_photo && metadata.real_photo.status === "completed") {
      for (const field of ["license", "source_url", "image_url"]) {
        if (!realPhotoMetadata[field]) missing.push(`real_photo.${field}`);
      }
    }

    if (metadata.ai_fallback && resolvedVia === "ai_fallback") {
      for (const field of ["provider_id", "model_id", "provider_job_id", "prompt"]) {
        if (!aiFallbackMetadata[field] && !metadata[field]) missing.push(`ai_fallback.${field}`);
      }
    }
  }

  return {
    status: missing.length === 0 ? "passed" : "failed",
    missing,
  };
}

function checkSlotProfile(packageAsset) {
  const profileModes = expectedModesForProfile(packageAsset.image_usage_profile);
  const slotProfiles = expectedProfilesForSlot(packageAsset.image_slot);
  const issues = [];

  if (profileModes.length > 0 && !profileModes.includes(packageAsset.generation_mode)) {
    issues.push(
      `generation_mode ${packageAsset.generation_mode} does not match profile ${packageAsset.image_usage_profile}`,
    );
  }

  if (slotProfiles.length > 0 && !slotProfiles.includes(packageAsset.image_usage_profile)) {
    issues.push(
      `image_usage_profile ${packageAsset.image_usage_profile} does not match slot ${packageAsset.image_slot}`,
    );
  }

  return {
    status: issues.length === 0 ? "passed" : "failed",
    issues,
  };
}

async function checkDuplicates(rootDir, packageDir, assets) {
  const byHash = new Map();
  const duplicateGroups = [];
  const missingFiles = [];

  for (const asset of assets) {
    if (!asset.packaged_file_path) continue;
    const imagePath = path.resolve(packageDir, asset.packaged_file_path);

    if (!(await pathExists(imagePath))) {
      missingFiles.push({
        asset_instance_id: asset.asset_instance_id,
        path: toRelative(rootDir, imagePath),
      });
      continue;
    }

    const hash = await sha256(imagePath);
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({
      asset_instance_id: asset.asset_instance_id,
      path: toRelative(rootDir, imagePath),
    });
  }

  for (const [hash, group] of byHash.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({ sha256: hash, assets: group });
    }
  }

  return {
    status: duplicateGroups.length === 0 && missingFiles.length === 0 ? "passed" : "failed",
    duplicate_groups: duplicateGroups,
    missing_files: missingFiles,
  };
}

async function validateCityPackage(rootDir, testCase) {
  const packageDir = path.resolve(rootDir, testCase.packagePath);
  const outputDir = path.resolve(rootDir, "output", "multi_city_validation_runs", testCase.city);
  const reportPath = path.resolve(outputDir, "validation_report.json");
  const issues = [];
  const warnings = [];

  if (!(await pathExists(packageDir))) {
    const missingReport = {
      city: testCase.city,
      package_path: toRelative(rootDir, packageDir),
      status: "failed",
      issues: [`Package does not exist: ${toRelative(rootDir, packageDir)}`],
      warnings,
    };
    await writeJson(reportPath, missingReport);
    return missingReport;
  }

  const packageManifest = await readJson(path.resolve(packageDir, "package_manifest.json"));
  const assemblyReport = await readJson(path.resolve(packageDir, "validation", "assembly_report.json"));
  const assets = packageManifest.images?.assets || [];
  const reviewReport = await validatePackageReviewRules({
    rootDir,
    packagePath: testCase.packagePath,
  });
  const assetChecks = [];

  for (const asset of assets) {
    const imageAssetPath = path.resolve(packageDir, asset.image_asset_path);
    const imageAsset = await readJson(imageAssetPath);
    const provenance = checkProvenance(asset, imageAsset);
    const slotProfile = checkSlotProfile(asset);

    if (provenance.status !== "passed") {
      issues.push(`Provenance incomplete for ${asset.asset_instance_id}: ${provenance.missing.join(", ")}`);
    }

    if (slotProfile.status !== "passed") {
      warnings.push(`Slot/profile mismatch for ${asset.asset_instance_id}: ${slotProfile.issues.join(" | ")}`);
    }

    assetChecks.push({
      asset_instance_id: asset.asset_instance_id,
      image_slot: asset.image_slot,
      image_usage_profile: asset.image_usage_profile,
      generation_mode: asset.generation_mode,
      source: asset.source,
      status: asset.status,
      provenance,
      slot_profile_consistency: slotProfile,
    });
  }

  const duplicateCheck = await checkDuplicates(rootDir, packageDir, assets);
  if (duplicateCheck.status !== "passed") {
    issues.push("Duplicate image check failed.");
  }

  if (assemblyReport.status !== "passed") {
    issues.push(`Assembly status is ${assemblyReport.status}.`);
  }

  if (reviewReport.status !== "passed") {
    issues.push(`Asset review status is ${reviewReport.status}.`);
  }

  const report = {
    validation_version: "multi_city_package_validation_v1",
    generated_on: new Date().toISOString(),
    city: testCase.city,
    package_path: toRelative(rootDir, packageDir),
    status: issues.length === 0 ? "passed" : "failed",
    package_id: packageManifest.package_id,
    package_city: packageManifest.city,
    package_title: packageManifest.title,
    package_days: packageManifest.days,
    assembly_status: assemblyReport.status,
    asset_review_status: reviewReport.status,
    provenance_status: assetChecks.every((asset) => asset.provenance.status === "passed") ? "passed" : "failed",
    slot_profile_consistency_status: assetChecks.every((asset) => asset.slot_profile_consistency.status === "passed")
      ? "passed"
      : "warning",
    city_mood_as_poi_status: reviewReport.hard_failures.some((failure) => failure.code === "city_mood_as_poi")
      ? "failed"
      : "passed",
    food_storefront_only_status: reviewReport.hard_failures.some((failure) => failure.code === "food_storefront_only")
      ? "failed"
      : "passed",
    duplicate_image_status: duplicateCheck.status,
    counts: {
      assets: assets.length,
      completed_assets: assets.filter((asset) => asset.status === "completed").length,
      hard_failures: reviewReport.counts.hard_failures,
      duplicate_groups: duplicateCheck.duplicate_groups.length,
    },
    asset_checks: assetChecks,
    duplicate_check: duplicateCheck,
    asset_review_report: {
      status: reviewReport.status,
      hard_failures: reviewReport.hard_failures,
      warnings: reviewReport.warnings,
    },
    issues,
    warnings,
  };

  await writeJson(reportPath, report);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.rootDir);
  const reports = [];

  for (const testCase of DEFAULT_CASES) {
    reports.push(await validateCityPackage(rootDir, testCase));
  }

  const summary = {
    validation_version: "multi_city_package_validation_v1",
    generated_on: new Date().toISOString(),
    status: reports.every((report) => report.status === "passed") ? "passed" : "failed",
    city_count: reports.length,
    passed_count: reports.filter((report) => report.status === "passed").length,
    failed_count: reports.filter((report) => report.status !== "passed").length,
    cities: reports.map((report) => ({
      city: report.city,
      package_path: report.package_path,
      status: report.status,
      assembly_status: report.assembly_status,
      asset_review_status: report.asset_review_status,
      provenance_status: report.provenance_status,
      slot_profile_consistency_status: report.slot_profile_consistency_status,
      city_mood_as_poi_status: report.city_mood_as_poi_status,
      food_storefront_only_status: report.food_storefront_only_status,
      duplicate_image_status: report.duplicate_image_status,
      assets: report.counts?.assets || 0,
      issues: report.issues || [],
    })),
  };

  const summaryPath = path.resolve(rootDir, "output", "multi_city_validation_runs", "summary_report.json");
  await writeJson(summaryPath, summary);

  console.log("Multi-city package validation completed:");
  console.log(`- status: ${summary.status}`);
  for (const city of summary.cities) {
    console.log(
      `- ${city.city}: ${city.status}, assembly=${city.assembly_status}, review=${city.asset_review_status}, provenance=${city.provenance_status}, slot_profile=${city.slot_profile_consistency_status}, duplicate=${city.duplicate_image_status}`,
    );
  }
  console.log(`- summary_report: ${toRelative(rootDir, summaryPath)}`);

  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  validateCityPackage,
};
