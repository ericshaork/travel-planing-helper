const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_TEMPLATE_PATH = path.join("templates", "examples", "hangzhou_couple_template.json");
const DEFAULT_RUN_ID = "hangzhou_couple_v1";

const preferenceByFamily = {
  signature_anchor: ["history", "photo", "local_culture"],
  historic_texture: ["history", "citywalk", "local_culture"],
  slow_solo: ["citywalk", "photo", "nature"],
  modern_contrast: ["citywalk", "photo"],
  evening_closure: ["nightlife", "photo", "citywalk"],
  food_backbone: ["food", "local_culture"],
};

const imageProfileDefaults = {
  cover: {
    image_usage_profile: "cover",
    default_generation_mode: "hybrid",
    source_preference: "mixed",
    review_required: true,
  },
  place: {
    image_usage_profile: "place",
    default_generation_mode: "real_photo",
    source_preference: "real_first",
    review_required: false,
  },
  experience: {
    image_usage_profile: "experience",
    default_generation_mode: "hybrid",
    source_preference: "mixed",
    review_required: true,
  },
  food: {
    image_usage_profile: "food",
    default_generation_mode: "real_photo",
    source_preference: "real_first",
    review_required: false,
  },
};

const slotDefaults = {
  explore_cover: {
    image_slot: "explore_cover",
    image_usage_profile: "cover",
    generation_mode: "hybrid",
    source_preference: "mixed",
    review_required: true,
  },
  trip_cover: {
    image_slot: "trip_cover",
    image_usage_profile: "cover",
    generation_mode: "ai_generated",
    source_preference: "ai_first",
    review_required: true,
  },
  day_cover: {
    image_slot: "day_cover",
    image_usage_profile: "experience",
    generation_mode: "hybrid",
    source_preference: "mixed",
    review_required: true,
  },
  poi_gallery: {
    image_slot: "poi_gallery",
    image_usage_profile: "place",
    generation_mode: "real_photo",
    source_preference: "real_first",
    review_required: false,
  },
  food_gallery: {
    image_slot: "food_gallery",
    image_usage_profile: "food",
    generation_mode: "real_photo",
    source_preference: "real_first",
    review_required: false,
  },
  detail_image: {
    image_slot: "detail_image",
    image_usage_profile: "place",
    generation_mode: "real_photo",
    source_preference: "real_first",
    review_required: false,
  },
};

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
      args.rootDir = next;
      index += 1;
    }
  }

  return args;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mapPace(pace) {
  return pace === "packed" ? "dense" : pace;
}

function inferPurpose(template) {
  const haystack = [
    template.traveler_profile?.motivation,
    template.traveler_profile?.theme,
    ...(template.city_identity?.signature_moods || []),
  ].join(" ").toLowerCase();

  if (haystack.includes("food")) {
    return "food_exploration";
  }

  if (haystack.includes("slow") || haystack.includes("tea") || haystack.includes("journal")) {
    return "deep_exploration";
  }

  return "first_visit";
}

function inferPreferences(template) {
  const families = template.asset_requirements?.families || [];
  const fromFamilies = families.flatMap((item) => preferenceByFamily[item.family] || []);
  const theme = `${template.traveler_profile?.theme || ""} ${template.traveler_profile?.motivation || ""}`.toLowerCase();
  const inferred = [...fromFamilies];

  if (theme.includes("food") || theme.includes("dish")) inferred.push("food");
  if (theme.includes("lake") || theme.includes("tea") || theme.includes("nature")) inferred.push("nature");
  if (theme.includes("museum") || theme.includes("temple")) inferred.push("museum", "history");
  if (theme.includes("walk") || theme.includes("street")) inferred.push("citywalk");

  return unique(inferred).filter((preference) =>
    [
      "food",
      "history",
      "nature",
      "citywalk",
      "photo",
      "museum",
      "shopping",
      "nightlife",
      "family_friendly",
      "local_culture",
    ].includes(preference),
  );
}

function buildFocusRules(template) {
  return [
    `Tone: ${template.content_rules.tone}.`,
    ...template.content_rules.route_quality,
    ...template.content_rules.poi_rules,
    ...template.content_rules.food_rules,
    ...template.content_rules.hard_constraints,
    ...template.city_identity.visual_identity_keywords.map((keyword) => `Preserve city visual identity: ${keyword}.`),
    ...template.city_identity.signature_moods.map((mood) => `Route mood should support: ${mood}.`),
  ];
}

function buildFamilySlotPlan(family) {
  if (family === "signature_anchor") {
    return [
      {
        family,
        image_slot: "explore_cover",
        image_usage_profile: "cover",
        generation_mode: "hybrid",
        source_preference: "mixed",
        reason: "Signature anchors need a recognizable place-entry cover with Wanderly editorial/journal mood.",
      },
      {
        family,
        image_slot: "poi_gallery",
        image_usage_profile: "place",
        generation_mode: "real_photo",
        source_preference: "real_first",
        reason: "Signature anchor galleries are place evidence and should stay real photo.",
      },
    ];
  }

  if (family === "food_backbone") {
    return [
      {
        family,
        image_slot: "food_gallery",
        image_usage_profile: "food",
        generation_mode: "real_photo",
        source_preference: "real_first",
        reason: "Food assets must not fabricate concrete dishes or shops.",
      },
    ];
  }

  if (family === "evening_closure") {
    return [
      {
        family,
        image_slot: "day_cover",
        image_usage_profile: "experience",
        generation_mode: "hybrid",
        source_preference: "mixed",
        reason: "Evening closure is an experience image and should allow Hybrid mood support.",
      },
    ];
  }

  if (family === "modern_contrast" || family === "historic_texture" || family === "slow_solo") {
    return [
      {
        family,
        image_slot: "poi_gallery",
        image_usage_profile: "place",
        generation_mode: "real_photo",
        source_preference: "real_first",
        reason: "Texture and walking assets need recognizable real place evidence by default.",
      },
      {
        family,
        image_slot: "day_cover",
        image_usage_profile: "experience",
        generation_mode: "hybrid",
        source_preference: "mixed",
        reason: "If promoted to a route memory or day mood, use Hybrid rather than a generic real photo.",
      },
    ];
  }

  return [
    {
      family,
      image_slot: "poi_gallery",
      image_usage_profile: "place",
      generation_mode: "real_photo",
      source_preference: "real_first",
      reason: "Unknown families default to real place evidence in dry-run.",
    },
  ];
}

function countMinimumPlannedImages(template) {
  const counts = {
    cover: 0,
    place: 0,
    experience: 0,
    food: 0,
  };

  for (const familyRequirement of template.asset_requirements.families) {
    const minimumCount = familyRequirement.minimum_count || 0;
    const plan = familyRequirement.slot_plan || buildFamilySlotPlan(familyRequirement.family);
    const uniqueProfiles = unique(plan.map((item) => item.image_usage_profile));

    for (const profile of uniqueProfiles) {
      counts[profile] += minimumCount;
    }
  }

  return counts;
}

function addCoverCandidatesForMinimums(familySlotStrategy, minimumImages) {
  const currentCoverMinimum = familySlotStrategy.reduce((total, familyRequirement) => {
    const hasCover = familyRequirement.slot_plan.some((slot) => slot.image_usage_profile === "cover");
    return total + (hasCover ? familyRequirement.minimum_count || 0 : 0);
  }, 0);
  let remainingCoverNeed = Math.max(0, (minimumImages.cover || 0) - currentCoverMinimum);

  if (remainingCoverNeed === 0) {
    return familySlotStrategy;
  }

  return familySlotStrategy.map((familyRequirement) => {
    if (
      remainingCoverNeed === 0 ||
      familyRequirement.family === "food_backbone" ||
      familyRequirement.slot_plan.some((slot) => slot.image_usage_profile === "cover")
    ) {
      return familyRequirement;
    }

    remainingCoverNeed -= familyRequirement.minimum_count || 0;

    return {
      ...familyRequirement,
      slot_plan: [
        {
          family: familyRequirement.family,
          image_slot: "trip_cover",
          image_usage_profile: "cover",
          generation_mode: "hybrid",
          source_preference: "mixed",
          reason: "Added by dry-run compiler to satisfy cover minimums with a concrete place or mood-led route cover candidate.",
        },
        ...familyRequirement.slot_plan,
      ],
    };
  });
}

function buildCompiledContentRequest(template, runId, templatePath) {
  const traveler = template.traveler_profile;
  const city = template.city_identity;
  const preferences = inferPreferences(template);

  return {
    compiler_version: "template_compiler_dry_run_v1",
    mode: "dry_run",
    run_id: runId,
    source_template_path: templatePath,
    template_refs: {
      city_template_id: template.template_id,
      city_template_version: template.template_version,
      image_template_id: template.image_template_ref.template_id,
      image_template_version: template.image_template_ref.template_version,
    },
    city: {
      code: city.code,
      name: city.name,
      region_name: city.region_name,
      country: city.country,
      language: city.language,
      timezone: city.timezone,
      visual_identity_keywords: city.visual_identity_keywords,
      signature_moods: city.signature_moods,
      seasonal_texture: city.seasonal_texture || null,
    },
    traveler_profile: {
      traveler_type: traveler.traveler_type,
      days: traveler.days,
      season: traveler.season,
      budget: traveler.budget,
      pace: traveler.pace,
      motivation: traveler.motivation,
      theme: traveler.theme,
      must_include: traveler.must_include || [],
      avoid: traveler.avoid || [],
    },
    generate_request: {
      city: city.code,
      days: traveler.days,
      trip_type: traveler.traveler_type,
      budget: traveler.budget,
      theme: traveler.theme,
      preferences,
      pace: mapPace(traveler.pace),
    },
    request_context: {
      city: city.code,
      traveler_type: traveler.traveler_type,
      days: traveler.days,
      season: traveler.season,
      budget: traveler.budget,
      pace: traveler.pace,
      motivation: traveler.motivation,
      theme: traveler.theme,
    },
    content_asset_request: {
      traveler: traveler.traveler_type,
      season: traveler.season,
      purpose: inferPurpose(template),
      days: traveler.days,
    },
    focus_rules: buildFocusRules(template),
    required_asset_examples: traveler.must_include || [],
    avoid_asset_examples: traveler.avoid || [],
    asset_requirements: template.asset_requirements,
  };
}

function buildCompiledImageRequest(template, runId) {
  const baseFamilySlotStrategy = template.asset_requirements.families.map((familyRequirement) => ({
    family: familyRequirement.family,
    minimum_count: familyRequirement.minimum_count,
    purpose: familyRequirement.purpose,
    asset_examples: familyRequirement.asset_examples || [],
    slot_plan: buildFamilySlotPlan(familyRequirement.family),
  }));
  const family_slot_strategy = addCoverCandidatesForMinimums(
    baseFamilySlotStrategy,
    template.asset_requirements.minimum_images,
  );
  const countableTemplate = {
    ...template,
    asset_requirements: {
      ...template.asset_requirements,
      families: family_slot_strategy,
    },
  };

  return {
    compiler_version: "template_compiler_dry_run_v1",
    mode: "dry_run",
    run_id: runId,
    image_template_ref: template.image_template_ref,
    join_key: "asset_instance_id",
    asset_instance_id_rule: "{asset_id}_{image_slot}",
    usage_profile_defaults: imageProfileDefaults,
    slot_defaults: slotDefaults,
    minimum_images: template.asset_requirements.minimum_images,
    planned_minimum_images: countMinimumPlannedImages(countableTemplate),
    food_evidence_level: template.asset_requirements.food_evidence_level || "real_dish",
    golden_review_thresholds: template.asset_requirements.golden_review_thresholds || null,
    family_slot_strategy,
    provenance_requirements: {
      ai_generated: ["provider_id", "model_id", "provider_job_id", "prompt"],
      real_photo: ["source", "license", "source_url", "image_url"],
      hybrid: ["strategy", "real_photo_result", "ai_fallback_result"],
    },
  };
}

function validateCompiledOutputs(template, compiledContentRequest, compiledImageRequest) {
  const checks = [];
  const issues = [];
  const warnings = [];

  function pass(name, details) {
    checks.push({ name, status: "passed", details });
  }

  function fail(name, details) {
    checks.push({ name, status: "failed", details });
    issues.push(`${name}: ${details}`);
  }

  const cityCode = template.city_identity.code;
  if (compiledContentRequest.generate_request.city === cityCode && compiledContentRequest.request_context.city === cityCode) {
    pass("city_information_mapping", `Mapped city code ${cityCode} into generate_request and request_context.`);
  } else {
    fail("city_information_mapping", "City code mapping is inconsistent.");
  }

  const traveler = template.traveler_profile;
  if (
    compiledContentRequest.generate_request.trip_type === traveler.traveler_type &&
    compiledContentRequest.request_context.traveler_type === traveler.traveler_type &&
    compiledContentRequest.generate_request.days === traveler.days &&
    compiledContentRequest.request_context.season === traveler.season
  ) {
    pass("traveler_profile_mapping", `Mapped ${traveler.traveler_type}, ${traveler.days} days, ${traveler.season}, ${traveler.budget}.`);
  } else {
    fail("traveler_profile_mapping", "Traveler profile mapping is inconsistent.");
  }

  const familyCount = template.asset_requirements.families.length;
  if (compiledContentRequest.asset_requirements.families.length === familyCount) {
    pass("asset_requirement_mapping", `Mapped ${familyCount} asset families and minimum image counts.`);
  } else {
    fail("asset_requirement_mapping", "Asset requirement family count mismatch.");
  }

  const strategyFamilies = compiledImageRequest.family_slot_strategy.map((item) => item.family);
  const sourceFamilies = template.asset_requirements.families.map((item) => item.family);
  if (strategyFamilies.join("|") === sourceFamilies.join("|")) {
    pass("image_slot_strategy_mapping", `Mapped slot strategy for ${strategyFamilies.length} families.`);
  } else {
    fail("image_slot_strategy_mapping", "Image slot strategy family order or count mismatch.");
  }

  const modeViolations = compiledImageRequest.family_slot_strategy.flatMap((family) =>
    family.slot_plan.filter((slot) => {
      if (slot.image_usage_profile === "food") return slot.generation_mode !== "real_photo";
      if (slot.image_usage_profile === "place") return slot.generation_mode !== "real_photo";
      if (slot.image_usage_profile === "cover") return !["hybrid", "ai_generated"].includes(slot.generation_mode);
      if (slot.image_usage_profile === "experience") return slot.generation_mode !== "hybrid";
      return true;
    }),
  );

  if (modeViolations.length === 0) {
    pass("generation_mode_strategy", "cover/experience/place/food strategies match Image Decision v2 policy.");
  } else {
    fail("generation_mode_strategy", `Found ${modeViolations.length} generation mode violations.`);
  }

  const minimumImages = template.asset_requirements.minimum_images;
  const plannedMinimumImages = compiledImageRequest.planned_minimum_images;
  for (const profile of ["cover", "place", "experience", "food"]) {
    if (plannedMinimumImages[profile] < minimumImages[profile]) {
      warnings.push(
        `Planned dry-run minimum for ${profile} is ${plannedMinimumImages[profile]}, below requested ${minimumImages[profile]}. Actual asset selection may still satisfy this.`,
      );
    }
  }

  if (traveler.traveler_type === "friends") {
    warnings.push("City Template supports traveler_type=friends, but current Content Pipeline trip_type does not.");
  }

  if (traveler.pace === "packed") {
    warnings.push("Mapped template pace=packed to Content Pipeline pace=dense.");
  }

  return {
    status: issues.length === 0 ? "passed" : "failed",
    checks,
    issues,
    warnings,
  };
}

async function compileTemplateDryRun(options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const runId = options.runId || DEFAULT_RUN_ID;
  const templatePath = path.resolve(rootDir, options.templatePath || DEFAULT_TEMPLATE_PATH);
  const outputDir = path.resolve(rootDir, "output", "template_compile_runs", runId);

  const template = await readJson(templatePath);
  const relativeTemplatePath = path.relative(rootDir, templatePath).replace(/\\/g, "/");
  const compiledContentRequest = buildCompiledContentRequest(template, runId, relativeTemplatePath);
  const compiledImageRequest = buildCompiledImageRequest(template, runId);
  const validation = validateCompiledOutputs(template, compiledContentRequest, compiledImageRequest);
  const now = new Date().toISOString();

  const compileReport = {
    compiler_version: "template_compiler_dry_run_v1",
    mode: "dry_run",
    run_id: runId,
    generated_on: now,
    source_template_path: relativeTemplatePath,
    output_dir: path.relative(rootDir, outputDir).replace(/\\/g, "/"),
    status: validation.status,
    summary: {
      city: compiledContentRequest.city,
      traveler_profile: compiledContentRequest.traveler_profile,
      asset_family_count: compiledContentRequest.asset_requirements.families.length,
      minimum_images: compiledImageRequest.minimum_images,
      planned_minimum_images: compiledImageRequest.planned_minimum_images,
      join_key: compiledImageRequest.join_key,
    },
    validation,
    boundaries: {
      generated_travel_content: false,
      generated_images: false,
      ran_image_pipeline: false,
      modified_content_pipeline: false,
      modified_image_pipeline: false,
      modified_manifest_schema: false,
      modified_trip_package_builder: false,
    },
    next_step_recommendation: "Use this dry-run output to design H3.6.2 inventory-aware validation before any real generation.",
  };

  await writeJson(path.join(outputDir, "compiled_content_request.json"), compiledContentRequest);
  await writeJson(path.join(outputDir, "compiled_image_request.json"), compiledImageRequest);
  await writeJson(path.join(outputDir, "compile_report.json"), compileReport);

  return {
    outputDir,
    compiledContentRequest,
    compiledImageRequest,
    compileReport,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await compileTemplateDryRun(args);

  console.log("Template compiler dry-run completed:");
  console.log(`- run_id: ${result.compileReport.run_id}`);
  console.log(`- status: ${result.compileReport.status}`);
  console.log(`- output: ${result.outputDir}`);
  console.log(`- checks: ${result.compileReport.validation.checks.length}`);
  console.log(`- warnings: ${result.compileReport.validation.warnings.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  compileTemplateDryRun,
};
