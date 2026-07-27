const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeManifest } = require("../src/manifest/manifest_normalizer");
const { readImageManifest } = require("../src/manifest/read_image_manifest");
const { buildAssetTasks } = require("../src/tasks/build_asset_tasks");

const fixtureDir = path.join(__dirname, "fixtures", "upstream_manifest");
const fixtureFiles = [
  "beijing_couple_image_manifest_v1.json",
  "beijing_solo_image_manifest_v1.json",
  "beijing_student_image_manifest_v1.json"
];

function readFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), "utf8"));
}

test("manifest normalizer maps upstream images[] into internal assets[]", () => {
  const rawManifest = readFixture("beijing_couple_image_manifest_v1.json");
  const normalized = normalizeManifest(rawManifest);

  assert.equal(normalized.manifest_id, "beijing_couple_image_manifest_v1");
  assert.ok(Array.isArray(normalized.assets));
  assert.equal(normalized.assets.length, 7);
  assert.equal(normalized.assets[0].asset_id, "ca_beijing_forbidden_city");
  assert.equal(normalized.assets[0].image_slot, "explore_cover");
  assert.equal(normalized.assets[0].source_preference, "real_photo");
  assert.equal(normalized.assets[0].generation_mode, "real_photo");
  assert.equal(normalized.assets[5].generation_mode, "hybrid");
});

test("manifest normalizer preserves richer upstream metadata when provided", () => {
  const rawManifest = {
    trip_id: "beijing_couple_image_manifest_v1_1",
    city: "beijing",
    images: [
      {
        asset_id: "ca_beijing_forbidden_city",
        asset_name: "故宫博物院",
        image_slot: "explore_cover",
        type: "hero",
        source_preference: "real_first",
        generation_mode: "real_photo",
        decision_reason: "Historic place should prioritize realism.",
        prompt: "Forbidden City at soft morning light.",
        location_context: {
          city: "beijing",
          district: "Dongcheng",
          poi: "故宫博物院",
          keywords: ["Forbidden City Beijing", "Palace Museum Beijing"]
        },
        search_keywords: ["Forbidden City Beijing", "Palace Museum Beijing", "Forbidden City courtyard"],
        visual_subject: {
          main_subject: "historic palace architecture",
          secondary_elements: ["courtyard", "red walls"]
        },
        status: "pending"
      }
    ]
  };

  const normalized = normalizeManifest(rawManifest);

  assert.ok(Array.isArray(normalized.assets[0].metadata.search_keywords));
  assert.ok(normalized.assets[0].metadata.search_keywords.length > 0);
  assert.equal(normalized.assets[0].metadata.location_context.city, "beijing");
  assert.equal(normalized.assets[0].metadata.visual_subject.main_subject, "historic palace architecture");
});

test("reader and task builder preserve upstream image_usage_profile in task metadata", () => {
  const rawManifest = {
    manifest_id: "manifest_image_usage_profile_test",
    city: "beijing",
    images: [
      {
        asset_id: "ca_beijing_shichahai",
        asset_name: "Shichahai",
        image_slot: "poi_gallery",
        type: "experience",
        source_preference: "hybrid",
        generation_mode: "mixed",
        image_usage_profile: "experience",
        decision_reason: "Experience asset should keep usage profile for hybrid strategy.",
        prompt: "Shichahai walking experience."
      }
    ]
  };

  const manifest = readImageManifest(rawManifest);
  const tasks = buildAssetTasks(manifest);

  assert.equal(manifest.items[0].metadata.image_usage_profile, "experience");
  assert.equal(tasks[0].metadata.image_usage_profile, "experience");
});

for (const fileName of fixtureFiles) {
  test(`reader and task builder accept real upstream manifest: ${fileName}`, () => {
    const filePath = path.join(fixtureDir, fileName);
    const manifest = readImageManifest(filePath);
    const tasks = buildAssetTasks(manifest);

    assert.ok(manifest.manifest_id);
    assert.ok(Array.isArray(manifest.items));
    assert.ok(manifest.items.length > 0);
    assert.equal(tasks.length, manifest.items.length);
    assert.equal(tasks[0].asset_id, manifest.items[0].asset_id);
    assert.equal(tasks[0].image_slot, manifest.items[0].image_slot);
    assert.equal(tasks[0].generation_mode, manifest.items[0].generation_mode);
    assert.ok(["real_photo", "hybrid"].includes(tasks[0].generation_mode));
  });
}
