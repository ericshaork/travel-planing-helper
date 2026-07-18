const fs = require("fs");
const path = require("path");
const { loadScenePack } = require("./load_scene_pack");

const DEFAULT_SCHEMA_VERSION = "1.0.0";
const DEFAULT_REQUESTED_AT = "1970-01-01T00:00:00.000Z";

const ASSET_ROLE_CONFIG = {
  cover: {
    usage: ["card", "detail_header", "social_share"],
    priority: 1,
    variantsRequested: 1,
    outputSpec: {
      aspect_ratio: "4:5",
      orientation: "portrait",
      min_width: 1080,
      min_height: 1350,
      transparent_background: false
    },
    visualIntent: {
      style_family: "editorial_travel",
      style_keywords: [
        "watercolor",
        "hand drawn",
        "collage",
        "vintage travel poster",
        "oriental travel aesthetic"
      ],
      mood_keywords: ["inviting", "narrative", "collectible"],
      authenticity_level: "illustrative"
    }
  },
  place: {
    usage: ["gallery", "section_inline"],
    priority: 2,
    variantsRequested: 1,
    outputSpec: {
      aspect_ratio: "3:2",
      orientation: "landscape",
      min_width: 1440,
      min_height: 960,
      transparent_background: false
    },
    visualIntent: {
      style_family: "place_identity",
      style_keywords: ["realistic photography", "location identity", "cultural detail"],
      mood_keywords: ["authentic", "place-first"],
      authenticity_level: "photoreal"
    }
  },
  food: {
    usage: ["section_inline", "gallery"],
    priority: 3,
    variantsRequested: 1,
    outputSpec: {
      aspect_ratio: "4:5",
      orientation: "portrait",
      min_width: 1080,
      min_height: 1350,
      transparent_background: false
    },
    visualIntent: {
      style_family: "food_story",
      style_keywords: ["professional food photography", "regional culture", "atmosphere"],
      mood_keywords: ["appetizing", "warm", "local"],
      authenticity_level: "photoreal"
    }
  },
  scene: {
    usage: ["day_block", "section_inline"],
    priority: 3,
    variantsRequested: 1,
    outputSpec: {
      aspect_ratio: "16:9",
      orientation: "landscape",
      min_width: 1600,
      min_height: 900,
      transparent_background: false
    },
    visualIntent: {
      style_family: "scene_diary",
      style_keywords: ["travel diary", "emotional atmosphere", "daily moment"],
      mood_keywords: ["immersive", "temporal", "reflective"],
      authenticity_level: "stylized_real"
    }
  },
  experience: {
    usage: ["section_inline", "gallery"],
    priority: 4,
    variantsRequested: 1,
    outputSpec: {
      aspect_ratio: "3:2",
      orientation: "landscape",
      min_width: 1440,
      min_height: 960,
      transparent_background: false
    },
    visualIntent: {
      style_family: "experience_memory",
      style_keywords: ["immersive", "human activity", "memory"],
      mood_keywords: ["participatory", "sensory", "intimate"],
      authenticity_level: "stylized_real"
    }
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

function buildSceneSelection(entity, options = {}) {
  const location = entity.location || {};
  const scenePack = loadScenePack(location.city, options);

  if (!scenePack || toArray(scenePack.scenes).length === 0) {
    return undefined;
  }

  return {
    city: scenePack.city,
    source_path: scenePack.source_path,
    selection_mode: "variant_index",
    variant_scene_map: scenePack.scenes.map((scene, index) => ({
      variant_index: index + 1,
      scene_id: scene.scene_id,
      name: scene.name,
      mood: scene.mood,
      visual_elements: scene.visual_elements,
      avoid: scene.avoid
    }))
  };
}

function slugify(value, fallback = "item") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function buildSourceDocument(plan, sourceRef) {
  const sourceDocument = plan.source_document || {};

  return {
    document_type: sourceDocument.document_type || plan.document_type || "travel_plan",
    document_id: sourceDocument.document_id || plan.trip_id || plan.id || "unknown_trip",
    document_version: sourceDocument.document_version || plan.document_version || plan.version,
    source_ref: sourceDocument.source_ref || sourceRef,
    locale: sourceDocument.locale || plan.locale
  };
}

function buildGlobalContext(plan) {
  return pickDefined({
    destination: plan.destination,
    audience: toArray(plan.audience),
    themes: toArray(plan.travel_concept || plan.themes),
    style_direction: toArray(plan.style_direction),
    content_warnings: toArray(plan.content_warnings)
  });
}

function mergeVisualIntent(baseIntent, subject) {
  return pickDefined({
    style_family: baseIntent.style_family,
    style_keywords: baseIntent.style_keywords,
    mood_keywords: baseIntent.mood_keywords,
    authenticity_level: baseIntent.authenticity_level,
    must_include: toArray(subject.must_include),
    avoid: toArray(subject.avoid),
    cultural_notes: toArray(subject.cultural_notes)
  });
}

function buildSubject(entity) {
  return pickDefined({
    entity_type: entity.entity_type,
    entity_id: entity.entity_id,
    entity_ref: entity.entity_ref,
    title: entity.title,
    summary: entity.summary,
    tags: toArray(entity.tags),
    time_context: entity.time_context,
    location: entity.location
  });
}

function buildAssetRequest(entity, index, options = {}) {
  const config = ASSET_ROLE_CONFIG[entity.asset_role];

  if (!config) {
    throw new Error(`Unsupported asset_role "${entity.asset_role}" in entity "${entity.entity_ref || index}".`);
  }

  const assetKey = entity.entity_id || entity.entity_ref || `${entity.asset_role}_${index + 1}`;

  return {
    asset_request_id: `assetreq_${slugify(assetKey, `${entity.asset_role}_${index + 1}`)}`,
    asset_role: entity.asset_role,
    subject: buildSubject(entity),
    scene: buildSceneSelection(entity, options),
    style_reference: entity.style_reference,
    selection_hints: pickDefined({
      suggested_source: entity.suggested_source,
      description: entity.description,
      scene_hint: entity.scene_hint
    }),
    usage: entity.usage || config.usage,
    visual_intent: mergeVisualIntent(config.visualIntent, entity),
    composition_hints: toArray(entity.composition_hints),
    output_spec: entity.output_spec || config.outputSpec,
    priority: entity.priority || config.priority,
    variants_requested: entity.variants_requested || config.variantsRequested,
    metadata: pickDefined({
      source_object_type: entity.source_object_type || entity.entity_type,
      source_role: entity.source_role,
      notes: entity.notes
    })
  };
}

function extractEntities(plan) {
  const entities = toArray(plan.entities);

  return entities.filter((entity) => {
    if (!entity || typeof entity !== "object") {
      return false;
    }

    return Boolean(entity.asset_role && entity.entity_type && entity.entity_ref);
  });
}

function buildImageRequest(plan, options = {}) {
  assertObject(plan, "plan");

  const sourceRef = options.sourceRef || plan.source_ref || "memory://plan";
  const requestId = options.requestId || `imgreq_${slugify(plan.trip_id || plan.id || "trip")}`;
  const entities = extractEntities(plan);

  if (entities.length === 0) {
    throw new Error(
      "No mappable entities found. Expected plan.entities[] entries with asset_role, entity_type, and entity_ref."
    );
  }

  return {
    schema_version: DEFAULT_SCHEMA_VERSION,
    request_id: requestId,
    request_label: plan.title || plan.trip_label || requestId,
    source_document: buildSourceDocument(plan, sourceRef),
    global_context: buildGlobalContext(plan),
    asset_requests: entities.map((entity, index) => buildAssetRequest(entity, index, options)),
    requested_at: options.requestedAt || plan.requested_at || DEFAULT_REQUESTED_AT,
    metadata: pickDefined({
      trip_id: plan.trip_id || plan.id,
      builder_version: "phase1-request-builder-skeleton",
      source_semantics_version: plan.semantic_version
    })
  };
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node build_image_request.js <input-plan.json> <output-image-request.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  const raw = fs.readFileSync(inputPath, "utf8");
  const plan = JSON.parse(raw);
  const imageRequest = buildImageRequest(plan, { sourceRef: inputPath });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(imageRequest, null, 2)}\n`, "utf8");
}

module.exports = {
  buildImageRequest
};

if (require.main === module) {
  main();
}
