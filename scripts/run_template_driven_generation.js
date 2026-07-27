const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const { compileTemplateDryRun } = require("./compile_template_dry_run");
const { buildTripPackage } = require("./build_trip_package");

const DEFAULT_TEMPLATE_PATH = path.join("templates", "examples", "hangzhou_couple_template.json");
const DEFAULT_RUN_ID = "hangzhou_couple_v1";

function parseArgs(argv) {
  const args = {
    templatePath: DEFAULT_TEMPLATE_PATH,
    runId: DEFAULT_RUN_ID,
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--template" && next) {
      args.templatePath = next;
      index += 1;
    } else if (arg === "--run-id" && next) {
      args.runId = next;
      index += 1;
    } else if (arg === "--root-dir" && next) {
      args.rootDir = path.resolve(next);
      index += 1;
    }
  }

  return args;
}

function parseEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) {
    return {};
  }

  const parsed = {};
  const raw = fsSync.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
    parsed[key] = value ? "[set]" : "[empty]";
  }

  return parsed;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function cleanDirectory(dirPath, rootDir) {
  const resolvedDir = path.resolve(dirPath);
  const resolvedRoot = path.resolve(rootDir);

  if (!resolvedDir.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to clean directory outside workspace: ${resolvedDir}`);
  }

  await fs.rm(resolvedDir, { recursive: true, force: true });
}

async function importModule(filePath) {
  return import(pathToFileURL(filePath).href);
}

function toPackagePath(...parts) {
  return parts.join("/");
}

function buildAssetInstanceId(assetId, imageSlot) {
  return `${assetId}_${imageSlot}`;
}

function normalizeCitySearchContext(manifest, city) {
  return {
    ...manifest,
    images: manifest.images.map((image) => {
      const replaceCity = (value) =>
        typeof value === "string" ? value.replace(/\bBeijing\b/g, city.name).replace(/\bbeijing\b/g, city.code) : value;

      return {
        ...image,
        location_context: {
          ...image.location_context,
          city: city.code,
          poi: image.location_context && image.location_context.poi ? image.location_context.poi : image.asset_name,
          keywords: Array.isArray(image.location_context && image.location_context.keywords)
            ? image.location_context.keywords.map(replaceCity)
            : [`${image.asset_name} ${city.name}`],
        },
        search_keywords: Array.isArray(image.search_keywords)
          ? image.search_keywords.map(replaceCity)
          : [`${image.asset_name} ${city.name}`],
      };
    }),
  };
}

function buildCityMoodCover(template, existingImages) {
  const city = template.city_identity;
  const assetId = `ca_${city.code}_city_mood`;
  const imageSlot = "explore_cover";
  const assetInstanceId = buildAssetInstanceId(assetId, imageSlot);

  if (existingImages.some((image) => image.asset_instance_id === assetInstanceId)) {
    return null;
  }

  return {
    asset_instance_id: assetInstanceId,
    asset_id: assetId,
    asset_name: `${city.name} city mood`,
    image_slot: imageSlot,
    type: "hero",
    source_preference: "ai_first",
    generation_mode: "ai_generated",
    decision_reason: "Template-driven city mood cover added to exercise the ai_generated path without fabricating a concrete shop, food, or POI evidence image.",
    prompt: [
      `${city.name} spring couple travel magazine cover with private journal feeling.`,
      `Visual identity: ${city.visual_identity_keywords.join(", ")}.`,
      `Mood: ${city.signature_moods.join(", ")}.`,
      "No text, no logo, no fake signage, no named restaurant or dish fabrication.",
    ].join(" "),
    location_context: {
      city: city.code,
      district: "N/A",
      poi: city.name,
      keywords: city.visual_identity_keywords.slice(0, 3),
    },
    search_keywords: city.visual_identity_keywords.map((keyword) => `${keyword} ${city.name}`),
    visual_subject: {
      main_subject: `${city.name} romantic city mood`,
      secondary_elements: city.visual_identity_keywords.slice(0, 4),
    },
    image_usage_profile: "cover",
    review_requirement: {
      required: true,
      reason: "Template-driven city mood cover requires Golden Sample visual review.",
    },
    status: "pending",
  };
}

function normalizeExplorePlanForPackage(plan) {
  return {
    ...plan,
    daily_itinerary: Array.isArray(plan.daily_itinerary)
      ? plan.daily_itinerary.map((day, index) => ({
        ...day,
        day: index + 1,
      }))
      : plan.daily_itinerary,
  };
}

function applyTemplateImageStrategy(manifest, template, compiledImageRequest) {
  const cityNormalizedManifest = normalizeCitySearchContext(manifest, template.city_identity);
  const images = cityNormalizedManifest.images.map((image) => {
    if (image.image_usage_profile === "place" || image.image_usage_profile === "food") {
      return {
        ...image,
        source_preference: "real_first",
        generation_mode: "real_photo",
        decision_reason: `${image.decision_reason} Template policy enforced ${image.image_usage_profile} imagery as real_photo evidence.`.trim(),
      };
    }

    return image;
  });
  const cityMoodCover = buildCityMoodCover(template, images);

  if (cityMoodCover) {
    images.push(cityMoodCover);
  }

  const strategyCounts = images.reduce((counts, image) => {
    counts[image.generation_mode] = (counts[image.generation_mode] || 0) + 1;
    return counts;
  }, {});

  return {
    ...cityNormalizedManifest,
    manifest_id: compiledImageRequest.run_id,
    images,
    metadata: {
      template_compiler_run_id: compiledImageRequest.run_id,
      image_template_id: compiledImageRequest.image_template_ref.template_id,
      image_template_version: compiledImageRequest.image_template_ref.template_version,
      join_key: compiledImageRequest.join_key,
      asset_instance_id_rule: compiledImageRequest.asset_instance_id_rule,
      strategy_counts: strategyCounts,
    },
  };
}

function assertImageManifestStrategy(manifest) {
  const issues = [];
  const counts = {
    real_photo: 0,
    ai_generated: 0,
    hybrid: 0,
  };
  const seen = new Set();

  for (const image of manifest.images) {
    if (!image.asset_instance_id || image.asset_instance_id !== buildAssetInstanceId(image.asset_id, image.image_slot)) {
      issues.push(`invalid asset_instance_id: ${image.asset_instance_id}`);
    }

    if (seen.has(image.asset_instance_id)) {
      issues.push(`duplicate asset_instance_id: ${image.asset_instance_id}`);
    }
    seen.add(image.asset_instance_id);

    if (Object.prototype.hasOwnProperty.call(counts, image.generation_mode)) {
      counts[image.generation_mode] += 1;
    }

    if (image.image_usage_profile === "food" && image.generation_mode !== "real_photo") {
      issues.push(`food image is not real_photo: ${image.asset_instance_id}`);
    }

    if (image.image_usage_profile === "place" && image.generation_mode !== "real_photo") {
      issues.push(`place image is not real_photo: ${image.asset_instance_id}`);
    }
  }

  for (const mode of Object.keys(counts)) {
    if (counts[mode] === 0) {
      issues.push(`missing generation mode path: ${mode}`);
    }
  }

  return {
    status: issues.length === 0 ? "passed" : "failed",
    counts,
    issues,
  };
}

function runNodeScript(scriptPath, args, cwd, env) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: node ${path.basename(scriptPath)} ${args.join(" ")}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ].filter(Boolean).join("\n"),
    );
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.rootDir);
  const runId = args.runId;
  const templatePath = path.resolve(rootDir, args.templatePath);
  const contentRoot = path.resolve(rootDir, "travel-content-pipeline");
  const imageRoot = path.resolve(rootDir, "image-pipeline", "image-pipeline");
  const goldenRunDir = path.resolve(contentRoot, "output", "golden_runs", runId);
  const imageRunDir = path.resolve(rootDir, "output", "manifest_runs", runId);
  const packageDir = path.resolve(rootDir, "trip_packages", runId);
  const orchestrationReportPath = path.resolve(rootDir, "output", "template_compile_runs", runId, "orchestration_report.json");
  const startedAt = new Date().toISOString();

  const report = {
    run_id: runId,
    mode: "template_driven_generation",
    started_at: startedAt,
    status: "running",
    steps: [],
    outputs: {},
    issues: [],
  };

  async function persistReport(status) {
    report.status = status;
    report.completed_at = new Date().toISOString();
    await writeJson(orchestrationReportPath, report);
  }

  try {
    const loadedContentEnv = parseEnvFile(path.resolve(contentRoot, ".env"));
    parseEnvFile(path.resolve(contentRoot, ".env.local"));
    parseEnvFile(path.resolve(imageRoot, ".env"));
    parseEnvFile(path.resolve(imageRoot, ".env.local"));

    await cleanDirectory(goldenRunDir, rootDir);
    await cleanDirectory(imageRunDir, rootDir);
    await cleanDirectory(packageDir, rootDir);
    report.steps.push({
      name: "clean_previous_run_outputs",
      status: "passed",
      directories: [
        path.relative(rootDir, goldenRunDir).replace(/\\/g, "/"),
        path.relative(rootDir, imageRunDir).replace(/\\/g, "/"),
        path.relative(rootDir, packageDir).replace(/\\/g, "/"),
      ],
    });

    const template = await readJson(templatePath);
    const compileResult = await compileTemplateDryRun({
      rootDir,
      runId,
      templatePath: path.relative(rootDir, templatePath),
    });
    report.steps.push({
      name: "template_compiler",
      status: compileResult.compileReport.status,
      output_dir: path.relative(rootDir, compileResult.outputDir).replace(/\\/g, "/"),
    });

    if (compileResult.compileReport.status !== "passed") {
      throw new Error("Template compiler did not pass.");
    }

    const previousCwd = process.cwd();
    process.chdir(contentRoot);

    const [{ generateExplorePlan }, { loadCityContext }, { createLlmProvider }, contentAssetModule, { buildContentAssetContext }, { exportImageManifest }, { writeJsonFile }, { validatePlanStructure }, { validatePlanQuality }] =
      await Promise.all([
        importModule(path.resolve(contentRoot, "dist", "generatePlan.js")),
        importModule(path.resolve(contentRoot, "dist", "loadContext.js")),
        importModule(path.resolve(contentRoot, "dist", "providers", "llm.js")),
        importModule(path.resolve(contentRoot, "dist", "contentAsset", "index.js")),
        importModule(path.resolve(contentRoot, "dist", "context", "contentAssetContextBuilder.js")),
        importModule(path.resolve(contentRoot, "dist", "contentAsset", "exportImageManifest.js")),
        importModule(path.resolve(contentRoot, "dist", "format.js")),
        importModule(path.resolve(contentRoot, "dist", "validation", "validatePlanStructure.js")),
        importModule(path.resolve(contentRoot, "dist", "validation", "validatePlanQuality.js")),
      ]);

    const assetLoadResult = await contentAssetModule.loadAssetsWithDiagnostics(
      compileResult.compiledContentRequest.city.code,
    );
    if (assetLoadResult.errors.length > 0) {
      throw new Error(`Content asset loading failed: ${assetLoadResult.errors.join(" | ")}`);
    }
    const rankedAssets = contentAssetModule.rankAssets(
      compileResult.compiledContentRequest.content_asset_request,
      assetLoadResult.assets,
    );
    const selection = contentAssetModule.selectCandidates(
      compileResult.compiledContentRequest.content_asset_request,
      rankedAssets,
    );
    const contentAssetContext = buildContentAssetContext(selection);
    const generationContext = {
      request_context: compileResult.compiledContentRequest.request_context,
      map_context: {
        transfer_burden: [],
      },
    };

    const cityContext = await loadCityContext(contentRoot, compileResult.compiledContentRequest.generate_request.city);
    const provider = createLlmProvider();
    const generatedExplorePlan = await generateExplorePlan({
      projectRoot: contentRoot,
      request: compileResult.compiledContentRequest.generate_request,
      cityContext,
      provider,
    });
    const explorePlan = normalizeExplorePlanForPackage(generatedExplorePlan);

    const structureValidation = validatePlanStructure(explorePlan);
    const qualityValidation = validatePlanQuality({
      plan: explorePlan,
      generationContext,
    });

    await writeJsonFile(path.resolve(goldenRunDir, "explore_plan.json"), explorePlan);
    report.steps.push({
      name: "content_pipeline",
      status: "passed",
      provider: provider.name,
      structure_valid: structureValidation.valid,
      quality_valid: qualityValidation.valid,
    });

    const baseImageManifest = exportImageManifest({
      trip_id: runId,
      city: compileResult.compiledContentRequest.city.code,
      content_asset_context: contentAssetContext,
    });
    const imageManifest = applyTemplateImageStrategy(baseImageManifest, template, compileResult.compiledImageRequest);
    const imageManifestStrategy = assertImageManifestStrategy(imageManifest);

    if (imageManifestStrategy.status !== "passed") {
      throw new Error(`Image Manifest strategy failed: ${imageManifestStrategy.issues.join(" | ")}`);
    }

    const imageManifestPath = path.resolve(goldenRunDir, "image_manifest.json");
    await writeJsonFile(imageManifestPath, imageManifest);

    const generationReport = {
      case_id: runId,
      generated_on: new Date().toISOString(),
      template_driven: true,
      template_id: template.template_id,
      compile_run_dir: path.relative(rootDir, compileResult.outputDir).replace(/\\/g, "/"),
      plan_output_path: path.relative(rootDir, path.resolve(goldenRunDir, "explore_plan.json")).replace(/\\/g, "/"),
      image_manifest_output_path: path.relative(rootDir, imageManifestPath).replace(/\\/g, "/"),
      schema_valid: true,
      structural_valid: structureValidation.valid,
      quality_valid: qualityValidation.valid,
      structural_errors: structureValidation.errors || [],
      quality_errors: qualityValidation.errors || [],
      quality_warnings: qualityValidation.warnings || [],
      content_asset_selection: {
        selected_asset_ids: contentAssetContext.selected_assets.map((asset) => asset.asset_id),
        families: contentAssetContext.selected_assets.map((asset) => ({
          asset_id: asset.asset_id,
          name: asset.name,
          editorial_roles: asset.editorial_roles,
        })),
      },
      image_manifest_strategy: imageManifestStrategy,
      env: {
        content_env_loaded: Object.keys(loadedContentEnv),
      },
    };

    await writeJsonFile(path.resolve(goldenRunDir, "generation_report.json"), generationReport);
    process.chdir(previousCwd);

    report.steps.push({
      name: "image_manifest",
      status: "passed",
      strategy_counts: imageManifestStrategy.counts,
      image_count: imageManifest.images.length,
    });

    const imagePipelineResult = runNodeScript(
      path.resolve(imageRoot, "run_manifest_pipeline.js"),
      [imageManifestPath, path.resolve(rootDir, "output", "manifest_runs")],
      imageRoot,
      process.env,
    );
    report.steps.push({
      name: "image_pipeline",
      status: "passed",
      stdout: imagePipelineResult.stdout.trim(),
      stderr: imagePipelineResult.stderr.trim(),
    });

    const tripPackageResult = await buildTripPackage({
      rootDir,
      tripId: runId,
      manifestId: runId,
    });
    report.steps.push({
      name: "trip_package_builder",
      status: tripPackageResult.assemblyReport.status,
      package_dir: path.relative(rootDir, tripPackageResult.packageDir).replace(/\\/g, "/"),
      packaged_assets: tripPackageResult.packageManifest.images.assets.length,
    });

    report.outputs = {
      compile_run_dir: path.relative(rootDir, compileResult.outputDir).replace(/\\/g, "/"),
      golden_run_dir: path.relative(rootDir, goldenRunDir).replace(/\\/g, "/"),
      image_manifest_path: path.relative(rootDir, imageManifestPath).replace(/\\/g, "/"),
      image_run_dir: toPackagePath("output", "manifest_runs", runId),
      trip_package_dir: path.relative(rootDir, tripPackageResult.packageDir).replace(/\\/g, "/"),
      package_manifest_path: path.relative(rootDir, tripPackageResult.packageManifestPath).replace(/\\/g, "/"),
      assembly_report_path: path.relative(rootDir, tripPackageResult.assemblyReportPath).replace(/\\/g, "/"),
    };

    await persistReport("passed");

    console.log("Template-driven Hangzhou generation completed:");
    console.log(`- status: passed`);
    console.log(`- package: ${tripPackageResult.packageDir}`);
    console.log(`- orchestration_report: ${orchestrationReportPath}`);
  } catch (error) {
    report.issues.push(error instanceof Error ? error.message : String(error));
    await persistReport("failed");
    console.error(`Template-driven generation failed: ${report.issues.join(" | ")}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
