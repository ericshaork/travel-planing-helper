const fs = require("fs");
const path = require("path");

const { buildImageRequest } = require("../request_builder");
const { buildNormalizedPromptSpec } = require("../prompt_builder");
const { createProvider, loadProviderConfig } = require("../providers");
const { buildAssetManifest } = require("../manifest");
const { loadEnv } = require("../config/load_env");

function slugify(value, fallback = "run") {
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

function resolveRunDir(outputRoot, tripId) {
  return path.join(outputRoot, slugify(tripId, "trip_run"));
}

async function runPipeline(plan, options = {}) {
  const providerConfig = options.providerConfig || loadProviderConfig(options.providerConfigPath);
  const envConfig = options.envConfig || loadEnv({
    projectRoot: path.resolve(__dirname, "..", "..")
  });
  const providerId = options.providerId || envConfig.defaultProvider || providerConfig.default_provider;
  const sourceRef = options.sourceRef || "memory://plan";
  const tripId = plan.trip_id || plan.id || plan.title || "trip_run";
  const outputRoot = options.outputRoot || path.join(process.cwd(), "image-pipeline", "output", "runs");
  const runDir = options.runDir || resolveRunDir(outputRoot, tripId);

  const imageRequest = buildImageRequest(plan, {
    sourceRef
  });

  const normalizedPromptSpec = buildNormalizedPromptSpec(imageRequest);
  const provider = createProvider(providerId, {
    config: providerConfig,
    envConfig,
    outputDir: path.join(runDir, "generated")
  });
  const providerJobResult = await provider.generate(normalizedPromptSpec);
  const assetManifest = buildAssetManifest(imageRequest, providerJobResult);

  return {
    imageRequest,
    normalizedPromptSpec,
    providerJobResult,
    assetManifest
  };
}

async function main() {
  const [, , inputArg, outputRootArg] = process.argv;

  if (!inputArg) {
    console.error("Usage: node run_pipeline.js <input-plan.json> [output-root]");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputRoot = path.resolve(outputRootArg || path.join(process.cwd(), "image-pipeline", "output", "runs"));
  const plan = readJson(inputPath);
  const tripId = plan.trip_id || plan.id || plan.title || "trip_run";
  const runDir = resolveRunDir(outputRoot, tripId);
  const providerConfig = loadProviderConfig();
  const envConfig = loadEnv({
    projectRoot: path.resolve(__dirname, "..", "..")
  });

  const result = await runPipeline(plan, {
    sourceRef: inputPath,
    providerConfig,
    envConfig,
    outputRoot,
    runDir
  });

  writeJson(path.join(runDir, "image_request.json"), result.imageRequest);
  writeJson(path.join(runDir, "normalized_prompt_spec.json"), result.normalizedPromptSpec);
  writeJson(path.join(runDir, "provider_job_result.json"), result.providerJobResult);
  writeJson(path.join(runDir, "asset_manifest.json"), result.assetManifest);
}

module.exports = {
  runPipeline
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
