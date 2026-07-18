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

function slugify(value, fallback = "manifest") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function normalizeGenerationMode(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  const mapping = {
    real_first: "real_photo",
    mixed: "hybrid",
    real_photo: "real_photo",
    ai_generated: "ai_generated",
    hybrid: "hybrid"
  };

  return mapping[normalized] || normalized || "unknown";
}

function normalizeSourcePreference(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "generated_first";
}

function normalizeUpstreamImage(item, city, index) {
  assertObject(item, `upstream manifest image at index ${index}`);

  if (!item.asset_id || typeof item.asset_id !== "string") {
    throw new Error(`upstream manifest image at index ${index} is missing a valid asset_id.`);
  }

  if (!item.image_slot || typeof item.image_slot !== "string") {
    throw new Error(`upstream manifest image "${item.asset_id}" is missing a valid image_slot.`);
  }

  return {
    asset_id: item.asset_id,
    asset_name: item.asset_name,
    image_slot: item.image_slot,
    type: item.type || "image",
    source_preference: normalizeSourcePreference(item.source_preference),
    generation_mode: normalizeGenerationMode(item.generation_mode),
    decision_reason: item.decision_reason || "",
    prompt: item.prompt || "",
    status: item.status,
    metadata: pickDefined({
      city,
      asset_name: item.asset_name,
      upstream_status: item.status
    })
  };
}

function isUpstreamImageManifest(manifest) {
  return toArray(manifest.images).length > 0;
}

function normalizeManifest(manifest) {
  assertObject(manifest, "manifest");

  if (!isUpstreamImageManifest(manifest)) {
    return manifest;
  }

  const assets = manifest.images.map((item, index) => normalizeUpstreamImage(item, manifest.city, index));

  return {
    manifest_id: manifest.manifest_id || manifest.id || manifest.trip_id || `manifest_${slugify(manifest.city, "upstream")}`,
    trip_id: manifest.trip_id,
    city: manifest.city,
    assets,
    metadata: pickDefined({
      city: manifest.city,
      trip_id: manifest.trip_id,
      source_protocol: "upstream_image_manifest_v1"
    })
  };
}

module.exports = {
  normalizeManifest,
  normalizeGenerationMode
};
