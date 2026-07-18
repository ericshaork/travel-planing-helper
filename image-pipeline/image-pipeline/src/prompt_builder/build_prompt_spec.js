const fs = require("fs");
const path = require("path");

const SPEC_VERSION = "1.0.0";

const STYLE_PROFILE_CONFIG = {
  cover: {
    style_profile_id: "wanderly_personal_travel_journal_cover_v2",
    style_family: "personal_travel_journal_cover",
    color_tendency: "muted_gray_blue_rice_paper_green",
    realism_level: "illustrative"
  },
  place: {
    style_profile_id: "realistic_place_photo_v1",
    style_family: "place_identity",
    color_tendency: "natural_cultural_detail",
    realism_level: "photoreal"
  },
  food: {
    style_profile_id: "food_story_photo_v1",
    style_family: "food_story",
    color_tendency: "warm_table_light",
    realism_level: "photoreal"
  },
  scene: {
    style_profile_id: "wanderly_scene_diary_v1",
    style_family: "scene_diary",
    color_tendency: "emotional_time_of_day",
    realism_level: "stylized_real"
  },
  experience: {
    style_profile_id: "wanderly_experience_memory_v1",
    style_family: "experience_memory",
    color_tendency: "immersive_human_warmth",
    realism_level: "stylized_real"
  }
};

const COMPOSITION_CONFIG = {
  cover: {
    shot_type: "original_editorial_travel_scene",
    framing: "balanced_composition_with_unique_scene_story",
    focus_priority: ["city-specific travel story", "original composition", "quiet journal mood"],
    foreground_background_balance: "soft_layered_depth",
    visual_density: "balanced",
    text_safe_area: "flexible_open_safe_area"
  },
  place: {
    shot_type: "establishing_location",
    framing: "place_first",
    focus_priority: ["location identity", "architectural or spatial detail", "cultural markers"],
    foreground_background_balance: "depth_with_context",
    visual_density: "balanced",
    text_safe_area: "edge_safe"
  },
  food: {
    shot_type: "food_focus",
    framing: "dish_first_with_atmosphere",
    focus_priority: ["food texture", "regional cues", "dining atmosphere"],
    foreground_background_balance: "foreground_emphasis",
    visual_density: "intimate",
    text_safe_area: "upper_safe"
  },
  scene: {
    shot_type: "environmental_moment",
    framing: "mood_first",
    focus_priority: ["time of day", "travel rhythm", "ambient detail"],
    foreground_background_balance: "cinematic_depth",
    visual_density: "open_breathing_space",
    text_safe_area: "corner_safe"
  },
  experience: {
    shot_type: "immersive_participation",
    framing: "human_activity_centered",
    focus_priority: ["human participation", "memory cues", "sensory context"],
    foreground_background_balance: "human_with_environment",
    visual_density: "focused",
    text_safe_area: "edge_safe"
  }
};

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickDefined(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function buildStyleReference(assetRequest) {
  const styleReference = assetRequest.style_reference;

  if (!styleReference || typeof styleReference !== "object") {
    return undefined;
  }

  const images = toArray(styleReference.images)
    .filter((image) => image && typeof image === "object" && image.path)
    .map((image) => pickDefined({
      path: image.path,
      purpose: image.purpose
    }));

  if (assetRequest.asset_role !== "cover" || images.length === 0) {
    return undefined;
  }

  return {
    images,
    usage_policy: {
      role: "visual_language_only",
      learn_from: [
        "watercolor texture",
        "paper feeling",
        "color palette",
        "quiet editorial mood"
      ],
      avoid_copying: [
        "object placement",
        "landmark arrangement",
        "exact scenery structure",
        "reference composition"
      ],
      output_expectation: "create_original_travel_scene"
    }
  };
}

function buildScene(assetRequest) {
  const scene = assetRequest.scene;

  if (!scene || typeof scene !== "object") {
    return undefined;
  }

  return {
    city: scene.city,
    selection_mode: scene.selection_mode,
    source_path: scene.source_path,
    variant_scene_map: toArray(scene.variant_scene_map).map((item) => pickDefined({
      variant_index: item.variant_index,
      scene_id: item.scene_id,
      name: item.name,
      mood: item.mood,
      visual_elements: toArray(item.visual_elements),
      avoid: toArray(item.avoid)
    }))
  };
}

function buildSubject(assetRequest) {
  const subject = assetRequest.subject || {};

  return {
    subject_type: assetRequest.asset_role,
    source_entity_type: subject.entity_type,
    source_entity_ref: subject.entity_ref,
    title: subject.title,
    summary: subject.summary,
    tags: toArray(subject.tags),
    location_context: subject.location || {},
    time_context: subject.time_context || {},
    identity_markers: buildIdentityMarkers(subject),
    cultural_markers: toArray(assetRequest.visual_intent && assetRequest.visual_intent.cultural_notes)
  };
}

function buildIdentityMarkers(subject) {
  const markers = [];

  if (subject.title) {
    markers.push(subject.title);
  }

  if (subject.location && subject.location.name && subject.location.name !== subject.title) {
    markers.push(subject.location.name);
  }

  return markers;
}

function buildStyleProfile(assetRequest) {
  const config = STYLE_PROFILE_CONFIG[assetRequest.asset_role];
  const visualIntent = assetRequest.visual_intent || {};

  if (!config) {
    throw new Error(`Unsupported asset_role "${assetRequest.asset_role}".`);
  }

  return {
    style_profile_id: config.style_profile_id,
    asset_role: assetRequest.asset_role,
    style_family: config.style_family,
    style_keywords: toArray(visualIntent.style_keywords),
    mood_keywords: toArray(visualIntent.mood_keywords),
    color_tendency: config.color_tendency,
    realism_level: config.realism_level
  };
}

function buildVisualDirection(assetRequest, imageRequest) {
  const visualIntent = assetRequest.visual_intent || {};
  const subject = assetRequest.subject || {};
  const globalContext = imageRequest.global_context || {};

  return {
    primary_goal: describePrimaryGoal(assetRequest.asset_role),
    authenticity_level: visualIntent.authenticity_level,
    style_family: visualIntent.style_family,
    destination_bias: pickDefined({
      city: subject.location && subject.location.city,
      region: subject.location && subject.location.region,
      country: subject.location && subject.location.country
    }),
    thematic_signals: toArray(globalContext.themes),
    audience_signals: toArray(globalContext.audience)
  };
}

function describePrimaryGoal(assetRole) {
  const goals = {
    cover: "express_trip_identity_as_editorial_visual_entrypoint",
    place: "show_recognizable_location_identity_with_cultural_detail",
    food: "show_food_identity_with_regional_and_table_atmosphere",
    scene: "amplify_itinerary_mood_and_time_of_day_feeling",
    experience: "show_human_participation_and_memory_like_moment"
  };

  return goals[assetRole] || "express_visual_subject_clearly";
}

function buildComposition(assetRequest) {
  const config = COMPOSITION_CONFIG[assetRequest.asset_role];

  return {
    ...config,
    provider_notes: toArray(assetRequest.composition_hints)
  };
}

function buildMood(assetRequest) {
  const visualIntent = assetRequest.visual_intent || {};
  const moodKeywords = toArray(visualIntent.mood_keywords);

  return {
    primary: moodKeywords[0],
    secondary: moodKeywords.slice(1),
    keywords: moodKeywords
  };
}

function buildConstraints(assetRequest) {
  const visualIntent = assetRequest.visual_intent || {};

  return {
    must_include: toArray(visualIntent.must_include),
    avoid: toArray(visualIntent.avoid),
    cultural_notes: toArray(visualIntent.cultural_notes),
    usage_constraints: toArray(assetRequest.usage),
    quality_requirements: ["clear_subject", "coherent_composition", "brand_consistent"]
  };
}

function buildPromptSpecItem(assetRequest, imageRequest) {
  const outputSpec = {
    ...(assetRequest.output_spec || {}),
    variant_count: assetRequest.variants_requested || 1
  };

  return {
    asset_request_id: assetRequest.asset_request_id,
    asset_role: assetRequest.asset_role,
    subject: buildSubject(assetRequest),
    scene: buildScene(assetRequest),
    style_reference: buildStyleReference(assetRequest),
    style_profile: buildStyleProfile(assetRequest),
    visual_direction: buildVisualDirection(assetRequest, imageRequest),
    composition: buildComposition(assetRequest),
    mood: buildMood(assetRequest),
    constraints: buildConstraints(assetRequest),
    output_spec: outputSpec
  };
}

function buildNormalizedPromptSpec(imageRequest) {
  assertObject(imageRequest, "imageRequest");

  const assetRequests = toArray(imageRequest.asset_requests);

  if (assetRequests.length === 0) {
    throw new Error("imageRequest.asset_requests must contain at least one item.");
  }

  return {
    spec_version: SPEC_VERSION,
    request_id: imageRequest.request_id,
    source_document: imageRequest.source_document || {},
    global_context: imageRequest.global_context || {},
    prompt_specs: assetRequests.map((assetRequest) => buildPromptSpecItem(assetRequest, imageRequest)),
    metadata: pickDefined({
      prompt_builder_version: "phase1-prompt-builder-skeleton",
      request_schema_version: imageRequest.schema_version
    })
  };
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node build_prompt_spec.js <input-image-request.json> <output-normalized-prompt-spec.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  const raw = fs.readFileSync(inputPath, "utf8");
  const imageRequest = JSON.parse(raw);
  const normalizedPromptSpec = buildNormalizedPromptSpec(imageRequest);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(normalizedPromptSpec, null, 2)}\n`, "utf8");
}

module.exports = {
  buildNormalizedPromptSpec
};

if (require.main === module) {
  main();
}
