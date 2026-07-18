const fs = require("fs");
const path = require("path");

const { readImageManifest } = require("../manifest/read_image_manifest");
const { buildAssetTasks } = require("../tasks/build_asset_tasks");
const { executeAssetTask } = require("../executor/execute_asset_task");
const { writeImageAsset } = require("../output/write_image_asset");

function slugify(value, fallback = "manifest_run") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function resolveRunDir(outputRoot, manifestId) {
  return path.join(outputRoot, slugify(manifestId, "manifest_run"));
}

async function runManifestPipeline(manifestInput, options = {}) {
  const manifest = typeof manifestInput === "string"
    ? readImageManifest(manifestInput)
    : readImageManifest(manifestInput);
  const tasks = buildAssetTasks(manifest);

  const outputRoot = options.outputRoot || path.join(process.cwd(), "output", "manifest_runs");
  const runDir = options.runDir || resolveRunDir(outputRoot, manifest.manifest_id);
  const assetsDir = path.join(runDir, "assets");
  const imageAssets = [];
  const executionResults = [];

  for (const task of tasks) {
    const result = await executeAssetTask(task);
    const assetOutputPath = path.join(assetsDir, `${task.asset_instance_id || task.asset_id}.image_asset.json`);
    const writtenPath = writeImageAsset(assetOutputPath, result.image_asset);

    imageAssets.push({
      asset_id: task.asset_id,
      asset_instance_id: task.asset_instance_id,
      file_path: writtenPath,
      image_asset: result.image_asset
    });
    executionResults.push(result);
  }

  const summary = {
    manifest_id: manifest.manifest_id,
    source_ref: manifest.source_ref,
    task_count: tasks.length,
    completed_count: executionResults.filter((result) => result.task_state.status === "completed").length,
    created_at: new Date().toISOString(),
    assets: imageAssets.map((item) => ({
      asset_id: item.asset_id,
      asset_instance_id: item.asset_instance_id,
      file_path: item.file_path,
      status: item.image_asset.status
    }))
  };

  return {
    manifest,
    tasks,
    executionResults,
    imageAssets,
    summary,
    runDir
  };
}

async function main() {
  const [, , inputArg, outputRootArg] = process.argv;

  if (!inputArg) {
    console.error("Usage: node run_manifest_pipeline.js <input-image-manifest.json> [output-root]");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputRoot = path.resolve(outputRootArg || path.join(process.cwd(), "output", "manifest_runs"));
  const rawManifest = readJson(inputPath);
  const manifest = readImageManifest(rawManifest);
  const runDir = resolveRunDir(outputRoot, manifest.manifest_id);

  const result = await runManifestPipeline(inputPath, {
    outputRoot,
    runDir
  });

  writeJson(path.join(runDir, "image_manifest.input.json"), rawManifest);
  writeJson(path.join(runDir, "asset_tasks.json"), result.tasks);
  writeJson(path.join(runDir, "pipeline_summary.json"), result.summary);
}

module.exports = {
  runManifestPipeline
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
