const fs = require("fs");
const path = require("path");

function slugify(value, fallback = "scene") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function loadScenePack(city, options = {}) {
  if (!city || typeof city !== "string") {
    return undefined;
  }

  const projectRoot = options.projectRoot || path.resolve(__dirname, "..", "..");
  const fileName = `${slugify(city)}.json`;
  const filePath = path.join(projectRoot, "input", "scenes", fileName);

  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  return {
    city: parsed.city || city,
    source_path: filePath,
    scenes: toArray(parsed.scenes)
      .filter((scene) => scene && typeof scene === "object")
      .map((scene, index) => ({
        scene_id: scene.scene_id || `${slugify(city)}_scene_${index + 1}`,
        name: scene.name,
        mood: scene.mood,
        visual_elements: toArray(scene.visual_elements),
        avoid: toArray(scene.avoid)
      }))
  };
}

module.exports = {
  loadScenePack
};
