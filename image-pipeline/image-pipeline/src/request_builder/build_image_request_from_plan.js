const fs = require("fs");
const path = require("path");

const { buildImageRequest } = require("./build_image_request");

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

function normalizeSuggestedSource(value) {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  const mapping = {
    ai: "generated",
    generated: "generated",
    model: "generated",
    external: "external",
    stock: "external",
    existing: "existing",
    legacy: "existing",
    hybrid: "hybrid"
  };

  return mapping[normalized] || normalized;
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

function inferDestination(plan) {
  if (plan.destination && typeof plan.destination === "object") {
    return plan.destination;
  }

  return pickDefined({
    city: plan.city,
    region: plan.region,
    country: plan.country
  });
}

function inferEntityType(assetRole) {
  const mapping = {
    cover: "trip",
    place: "poi",
    food: "food",
    scene: "scene_unit",
    experience: "experience"
  };

  return mapping[assetRole] || "content_entity";
}

function inferLocation(plan, section, imageRequirement) {
  const destination = inferDestination(plan);

  return pickDefined({
    city:
      imageRequirement.city ||
      section.city ||
      destination.city,
    region:
      imageRequirement.region ||
      section.region ||
      destination.region,
    country:
      imageRequirement.country ||
      section.country ||
      destination.country,
    name:
      imageRequirement.location_name ||
      section.location_name ||
      section.title ||
      plan.title
  });
}

function buildEntityFromSection(plan, section, index) {
  assertObject(section, `plan.sections[${index}]`);

  const imageRequirement = section.image_requirement;

  if (!imageRequirement || typeof imageRequirement !== "object" || Array.isArray(imageRequirement)) {
    return undefined;
  }

  if (!imageRequirement.asset_role || typeof imageRequirement.asset_role !== "string") {
    return undefined;
  }

  const assetRole = imageRequirement.asset_role.trim().toLowerCase();
  const sectionId = section.section_id || `section_${index + 1}`;
  const subjectTitle = imageRequirement.subject || section.title || plan.title || sectionId;

  return {
    asset_role: assetRole,
    entity_type: imageRequirement.entity_type || inferEntityType(assetRole),
    entity_id: imageRequirement.entity_id || sectionId,
    entity_ref: imageRequirement.entity_ref || `${assetRole}_${slugify(sectionId, `${assetRole}_${index + 1}`)}`,
    title: subjectTitle,
    summary: imageRequirement.description || section.summary || plan.summary,
    tags: toArray(section.tags),
    time_context: pickDefined({
      section_id: sectionId,
      scene_hint: imageRequirement.scene_hint,
      day_label: section.day_label,
      period: section.period
    }),
    location: inferLocation(plan, section, imageRequirement),
    source_object_type: "plan_section",
    source_role: sectionId,
    suggested_source: normalizeSuggestedSource(imageRequirement.suggested_source),
    description: imageRequirement.description,
    scene_hint: imageRequirement.scene_hint,
    notes: imageRequirement.notes,
    must_include: toArray(imageRequirement.must_include),
    avoid: toArray(imageRequirement.avoid),
    cultural_notes: toArray(imageRequirement.cultural_notes),
    variants_requested: imageRequirement.variants_requested,
    priority: imageRequirement.priority,
    usage: imageRequirement.usage,
    output_spec: imageRequirement.output_spec,
    composition_hints: toArray(imageRequirement.composition_hints),
    style_reference: imageRequirement.style_reference
  };
}

function buildAbstractPlanFromTravelPlan(plan) {
  assertObject(plan, "plan");

  const sections = toArray(plan.sections);
  const entities = sections
    .map((section, index) => buildEntityFromSection(plan, section, index))
    .filter(Boolean);

  if (entities.length === 0) {
    throw new Error("No mappable image requirements found. Expected plan.sections[].image_requirement entries.");
  }

  return {
    trip_id: plan.trip_id || plan.id,
    title: plan.title,
    destination: inferDestination(plan),
    audience: toArray(plan.audience),
    travel_concept: toArray(plan.travel_concept || plan.themes),
    style_direction: toArray(plan.style_direction),
    requested_at: plan.requested_at,
    source_document: {
      document_type: "travel_plan",
      document_id: plan.trip_id || plan.id || "unknown_trip",
      document_version: plan.version || plan.document_version,
      locale: plan.locale
    },
    entities
  };
}

function buildImageRequestFromPlan(plan, options = {}) {
  const abstractPlan = buildAbstractPlanFromTravelPlan(plan);

  return buildImageRequest(abstractPlan, options);
}

function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node build_image_request_from_plan.js <input-plan.json> <output-image-request.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  const raw = fs.readFileSync(inputPath, "utf8");
  const plan = JSON.parse(raw);
  const imageRequest = buildImageRequestFromPlan(plan, { sourceRef: inputPath });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(imageRequest, null, 2)}\n`, "utf8");
}

module.exports = {
  buildAbstractPlanFromTravelPlan,
  buildImageRequestFromPlan,
  normalizeSuggestedSource
};

if (require.main === module) {
  main();
}
