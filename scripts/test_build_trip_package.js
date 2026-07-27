const fs = require("node:fs/promises");
const path = require("node:path");

const { buildTripPackage } = require("./build_trip_package.js");

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const rootDir = process.cwd();
  const result = await buildTripPackage({
    rootDir,
    tripId: "beijing_couple_v1",
    manifestId: "couple_golden_v35",
  });

  const packageManifest = await readJson(result.packageManifestPath);
  const requiredPaths = [
    result.packageManifestPath,
    result.assemblyReportPath,
    path.resolve(result.packageDir, "content", "explore_plan.json"),
    path.resolve(result.packageDir, "content", "image_manifest.json"),
  ];

  for (const requiredPath of requiredPaths) {
    if (!(await pathExists(requiredPath))) {
      throw new Error(`Expected package output is missing: ${requiredPath}`);
    }
  }

  if (!Array.isArray(packageManifest.images.assets) || packageManifest.images.assets.length === 0) {
    throw new Error("package_manifest.images.assets is empty");
  }

  for (const asset of packageManifest.images.assets) {
    if (!asset.asset_instance_id) {
      throw new Error("Package asset is missing asset_instance_id");
    }

    if (asset.status === "completed" && !asset.packaged_file_path) {
      throw new Error(`Completed package asset has no packaged_file_path: ${asset.asset_instance_id}`);
    }

    const imageAssetPath = path.resolve(result.packageDir, asset.image_asset_path);
    if (!(await pathExists(imageAssetPath))) {
      throw new Error(`Packaged image_asset.json is missing: ${imageAssetPath}`);
    }

    if (asset.packaged_file_path) {
      const imageFilePath = path.resolve(result.packageDir, asset.packaged_file_path);
      if (!(await pathExists(imageFilePath))) {
        throw new Error(`Packaged image file is missing: ${imageFilePath}`);
      }
    }
  }

  console.log("Trip package builder smoke test passed:");
  console.log(`- package_manifest: ${result.packageManifestPath}`);
  console.log(`- assets: ${packageManifest.images.assets.length}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Trip package builder smoke test failed: ${message}`);
  process.exitCode = 1;
});
