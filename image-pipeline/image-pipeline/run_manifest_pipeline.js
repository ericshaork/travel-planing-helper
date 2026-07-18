const fs = require("fs");
const path = require("path");

const { runManifestPipeline } = require("./src/pipeline/run_manifest_pipeline");

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const [, , inputArg, outputRootArg] = process.argv;

  if (!inputArg) {
    console.error("Usage: node run_manifest_pipeline.js <input-image-manifest.json> [output-root]");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputRoot = path.resolve(outputRootArg || path.join(process.cwd(), "output", "manifest_runs"));
  const rawManifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const manifestId = rawManifest.manifest_id || rawManifest.id || "image_manifest";
  const runDir = path.join(
    outputRoot,
    String(manifestId).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "manifest_run"
  );

  const result = await runManifestPipeline(inputPath, {
    outputRoot,
    runDir
  });

  writeJson(path.join(runDir, "image_manifest.input.json"), rawManifest);
  writeJson(path.join(runDir, "asset_tasks.json"), result.tasks);
  writeJson(path.join(runDir, "pipeline_summary.json"), result.summary);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
