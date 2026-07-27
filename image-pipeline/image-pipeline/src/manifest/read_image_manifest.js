const fs = require("fs");
const path = require("path");
const { normalizeManifest } = require("./manifest_normalizer");

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

function normalizeManifestItem(item, index) {
  assertObject(item, `manifest item at index ${index}`);

  if (!item.asset_id || typeof item.asset_id !== "string") {
    throw new Error(`manifest item at index ${index} is missing a valid asset_id.`);
  }

  if (!item.image_slot || typeof item.image_slot !== "string") {
    throw new Error(`manifest item "${item.asset_id}" is missing a valid image_slot.`);
  }

  const baseMetadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata
    : {};

  return {
    asset_id: item.asset_id,
    image_slot: item.image_slot,
    type: item.type || "image",
    source_preference: item.source_preference || "generated_first",
    generation_mode: item.generation_mode || "mock_generation",
    decision_reason: item.decision_reason || "",
    prompt: item.prompt || "",
    metadata: pickDefined({
      ...baseMetadata,
      city: item.city,
      scene_hint: item.scene_hint,
      style_profile: item.style_profile,
      suggested_source: item.suggested_source,
      location_context: item.location_context !== undefined ? item.location_context : baseMetadata.location_context,
      search_keywords: item.search_keywords !== undefined ? item.search_keywords : baseMetadata.search_keywords,
      image_usage_profile: item.image_usage_profile !== undefined ? item.image_usage_profile : baseMetadata.image_usage_profile,
      visual_subject: item.visual_subject !== undefined ? item.visual_subject : baseMetadata.visual_subject
    })
  };
}

function readImageManifest(input) {
  let manifest;
  let sourcePath;

  if (typeof input === "string") {
    sourcePath = path.resolve(input);
    manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } else {
    manifest = input;
  }

  manifest = normalizeManifest(manifest);
  assertObject(manifest, "imageManifest");

  const rawItems = toArray(manifest.assets).length > 0
    ? manifest.assets
    : toArray(manifest.items);

  if (rawItems.length === 0) {
    throw new Error("imageManifest must contain assets[] or items[] with at least one entry.");
  }

  return {
    manifest_id: manifest.manifest_id || manifest.id || "image_manifest",
    source_ref: sourcePath || manifest.source_ref || "memory://image_manifest",
    created_at: manifest.created_at,
    items: rawItems.map((item, index) => normalizeManifestItem(item, index)),
    metadata: pickDefined({
      schema_version: manifest.schema_version,
      trip_id: manifest.trip_id,
      document_id: manifest.document_id
    })
  };
}

module.exports = {
  readImageManifest
};
