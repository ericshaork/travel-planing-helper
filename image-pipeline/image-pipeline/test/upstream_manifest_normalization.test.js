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
