const fs = require("node:fs/promises");
const path = require("node:path");

const PACKAGE_VERSION = "trip_package_v1";

function parseArgs(argv) {
  const args = {
    tripId: "beijing_couple_v1",
    manifestId: "couple_golden_v35",
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--trip-id" && next) {
      args.tripId = next;
      index += 1;
    } else if (arg === "--manifest-id" && next) {
      args.manifestId = next;
      index += 1;
    } else if (arg === "--root-dir" && next) {
      args.rootDir = path.resolve(next);
      index += 1;
    }
  }

  return args;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toPackagePath(...parts) {
  return parts.join("/");
}

function getImageFileName(assetInstanceId, sourceFilePath) {
  const extension = path.extname(sourceFilePath) || ".jpg";
  return `${assetInstanceId}${extension}`;
}

function assertUniqueAssetInstanceIds(records, label, issues) {
  const seen = new Set();

  for (const record of records) {
    const assetInstanceId = record && record.asset_instance_id;

    if (!assetInstanceId) {
      issues.push(`${label} has a record without asset_instance_id`);
      continue;
    }

    if (seen.has(assetInstanceId)) {
      issues.push(`${label} has duplicate asset_instance_id: ${assetInstanceId}`);
    }

    seen.add(assetInstanceId);
  }
}

async function buildTripPackage(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const tripId = options.tripId || "beijing_couple_v1";
  const manifestId = options.manifestId || "couple_golden_v35";

  const contentRunDir = path.resolve(rootDir, "travel-content-pipeline", "output", "golden_runs", tripId);
  const imageRunDir = path.resolve(rootDir, "output", "manifest_runs", manifestId);
  const packageDir = path.resolve(rootDir, "trip_packages", tripId);

  const sourcePaths = {
    explorePlan: path.resolve(contentRunDir, "explore_plan.json"),
    imageManifest: path.resolve(contentRunDir, "image_manifest.json"),
    generationReport: path.resolve(contentRunDir, "generation_report.json"),
    pipelineSummary: path.resolve(imageRunDir, "pipeline_summary.json"),
  };

  const outputPaths = {
    packageManifest: path.resolve(packageDir, "package_manifest.json"),
    assemblyReport: path.resolve(packageDir, "validation", "assembly_report.json"),
    contentExplorePlan: path.resolve(packageDir, "content", "explore_plan.json"),
    contentImageManifest: path.resolve(packageDir, "content", "image_manifest.json"),
    imageFilesDir: path.resolve(packageDir, "images", "files"),
    imageAssetsDir: path.resolve(packageDir, "images", "image_assets"),
  };

  const issues = [];
  const warnings = [];

  if (!(await pathExists(sourcePaths.explorePlan))) {
    issues.push(`Missing explore_plan.json: ${sourcePaths.explorePlan}`);
  }

  if (!(await pathExists(sourcePaths.imageManifest))) {
    issues.push(`Missing image_manifest.json: ${sourcePaths.imageManifest}`);
  }

  if (!(await pathExists(sourcePaths.pipelineSummary))) {
    issues.push(`Missing pipeline_summary.json: ${sourcePaths.pipelineSummary}`);
  }

  if (issues.length > 0) {
    throw new Error(`Trip package assembly failed before reading inputs: ${issues.join(" | ")}`);
  }

  const explorePlan = await readJson(sourcePaths.explorePlan);
  const imageManifest = await readJson(sourcePaths.imageManifest);
  const generationReport = (await pathExists(sourcePaths.generationReport))
    ? await readJson(sourcePaths.generationReport)
    : null;
  const pipelineSummary = await readJson(sourcePaths.pipelineSummary);

  const manifestImages = Array.isArray(imageManifest.images) ? imageManifest.images : [];
  const summaryAssets = Array.isArray(pipelineSummary.assets) ? pipelineSummary.assets : [];

  assertUniqueAssetInstanceIds(manifestImages, "image_manifest.images", issues);
  assertUniqueAssetInstanceIds(summaryAssets, "pipeline_summary.assets", issues);

  if (manifestImages.length !== summaryAssets.length) {
    issues.push(
      `Image count mismatch: image_manifest has ${manifestImages.length}, pipeline_summary has ${summaryAssets.length}`,
    );
  }

  const manifestByInstanceId = new Map(
    manifestImages.map((image) => [image.asset_instance_id, image]),
  );

  const assets = [];

  await fs.mkdir(outputPaths.imageFilesDir, { recursive: true });
  await fs.mkdir(outputPaths.imageAssetsDir, { recursive: true });
  await fs.mkdir(path.dirname(outputPaths.contentExplorePlan), { recursive: true });
  await fs.mkdir(path.dirname(outputPaths.assemblyReport), { recursive: true });

  await fs.copyFile(sourcePaths.explorePlan, outputPaths.contentExplorePlan);
  await fs.copyFile(sourcePaths.imageManifest, outputPaths.contentImageManifest);

  for (const summaryAsset of summaryAssets) {
    const assetInstanceId = summaryAsset.asset_instance_id;
    const manifestImage = manifestByInstanceId.get(assetInstanceId);

    if (!manifestImage) {
      issues.push(`Image asset is not present in image_manifest: ${assetInstanceId}`);
      continue;
    }

    const imageAssetPath = summaryAsset.file_path;
    if (!imageAssetPath || !(await pathExists(imageAssetPath))) {
      issues.push(`Missing image_asset.json for ${assetInstanceId}: ${imageAssetPath || "(empty)"}`);
      continue;
    }

    const imageAsset = await readJson(imageAssetPath);
    const imageAssetFileName = `${assetInstanceId}.image_asset.json`;
    const packagedImageAssetPath = path.resolve(outputPaths.imageAssetsDir, imageAssetFileName);

    if (imageAsset.asset_instance_id !== assetInstanceId) {
      issues.push(
        `asset_instance_id mismatch for ${assetInstanceId}: image_asset has ${imageAsset.asset_instance_id}`,
      );
    }

    if (imageAsset.status === "completed" && !imageAsset.file_path) {
      issues.push(`Completed image asset has no file_path: ${assetInstanceId}`);
    }

    let packagedImageFilePath = null;
    if (imageAsset.status === "completed" && imageAsset.file_path) {
      if (!(await pathExists(imageAsset.file_path))) {
        issues.push(`Completed image file is missing for ${assetInstanceId}: ${imageAsset.file_path}`);
      } else {
        const imageFileName = getImageFileName(assetInstanceId, imageAsset.file_path);
        const destinationImagePath = path.resolve(outputPaths.imageFilesDir, imageFileName);
        await fs.copyFile(imageAsset.file_path, destinationImagePath);
        packagedImageFilePath = toPackagePath("images", "files", imageFileName);
      }
    }

    await fs.copyFile(imageAssetPath, packagedImageAssetPath);

    assets.push({
      asset_instance_id: assetInstanceId,
      asset_id: manifestImage.asset_id,
      asset_name: manifestImage.asset_name,
      image_slot: manifestImage.image_slot,
      image_usage_profile: manifestImage.image_usage_profile,
      source_preference: manifestImage.source_preference,
      generation_mode: manifestImage.generation_mode,
      status: imageAsset.status,
      source: imageAsset.source,
      original_file_path: imageAsset.file_path || null,
      packaged_file_path: packagedImageFilePath,
      image_asset_path: toPackagePath("images", "image_assets", imageAssetFileName),
    });
  }

  for (const manifestImage of manifestImages) {
    if (!summaryAssets.some((asset) => asset.asset_instance_id === manifestImage.asset_instance_id)) {
      issues.push(`Manifest image is missing from pipeline_summary: ${manifestImage.asset_instance_id}`);
    }
  }

  const assemblyReport = {
    trip_id: tripId,
    manifest_id: manifestId,
    status: issues.length === 0 ? "passed" : "failed",
    generated_on: new Date().toISOString(),
    checks: {
      explore_plan_exists: await pathExists(sourcePaths.explorePlan),
      image_manifest_exists: await pathExists(sourcePaths.imageManifest),
      image_count_matches: manifestImages.length === summaryAssets.length,
      asset_instance_id_unique: issues.every((issue) => !issue.includes("duplicate asset_instance_id")),
      completed_assets_have_file_path: issues.every((issue) => !issue.includes("has no file_path")),
    },
    counts: {
      manifest_images: manifestImages.length,
      pipeline_assets: summaryAssets.length,
      packaged_assets: assets.length,
      completed_assets: assets.filter((asset) => asset.status === "completed").length,
    },
    issues,
    warnings,
  };

  if (issues.length > 0) {
    await fs.writeFile(outputPaths.assemblyReport, `${JSON.stringify(assemblyReport, null, 2)}\n`, "utf8");
    throw new Error(`Trip package assembly failed: ${issues.join(" | ")}`);
  }

  const packageManifest = {
    package_id: tripId,
    package_version: PACKAGE_VERSION,
    generated_on: assemblyReport.generated_on,
    trip_id: tripId,
    golden_run_id: tripId,
    content_trip_id: imageManifest.trip_id || explorePlan.id || null,
    image_manifest_id: pipelineSummary.manifest_id || manifestId,
    city: explorePlan.city || imageManifest.city || null,
    title: explorePlan.title || null,
    days: explorePlan.days || null,
    source_outputs: {
      content_run_dir: contentRunDir,
      image_run_dir: imageRunDir,
      explore_plan_path: sourcePaths.explorePlan,
      image_manifest_path: sourcePaths.imageManifest,
      generation_report_path: generationReport ? sourcePaths.generationReport : null,
      pipeline_summary_path: sourcePaths.pipelineSummary,
    },
    content: {
      explore_plan_path: toPackagePath("content", "explore_plan.json"),
      image_manifest_path: toPackagePath("content", "image_manifest.json"),
    },
    images: {
      files_dir: toPackagePath("images", "files"),
      image_assets_dir: toPackagePath("images", "image_assets"),
      assets,
    },
    validation: {
      assembly_report_path: toPackagePath("validation", "assembly_report.json"),
      status: assemblyReport.status,
    },
  };

  await fs.writeFile(outputPaths.packageManifest, `${JSON.stringify(packageManifest, null, 2)}\n`, "utf8");
  await fs.writeFile(outputPaths.assemblyReport, `${JSON.stringify(assemblyReport, null, 2)}\n`, "utf8");

  return {
    packageDir,
    packageManifestPath: outputPaths.packageManifest,
    assemblyReportPath: outputPaths.assemblyReport,
    packageManifest,
    assemblyReport,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildTripPackage(args);

  console.log("Trip package assembly completed:");
  console.log(`- package: ${result.packageDir}`);
  console.log(`- package_manifest: ${result.packageManifestPath}`);
  console.log(`- assembly_report: ${result.assemblyReportPath}`);
  console.log(`- assets: ${result.packageManifest.images.assets.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Trip package assembly failed: ${message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildTripPackage,
};
