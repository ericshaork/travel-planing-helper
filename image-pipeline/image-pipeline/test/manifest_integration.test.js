const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { readImageManifest } = require("../src/manifest/read_image_manifest");
const { runManifestPipeline } = require("../src/pipeline/run_manifest_pipeline");

const fixturePath = path.join(__dirname, "fixtures", "image_manifest.integration.fixture.json");

test("manifest integration fixture can be read without touching plan or context inputs", () => {
  const manifest = readImageManifest(fixturePath);

  assert.equal(manifest.manifest_id, "manifest_integration_fixture_v1");
  assert.equal(manifest.items.length, 3);
  assert.equal(manifest.items[0].asset_id, "sample_real_photo_asset");
  assert.equal(manifest.items[0].source_preference, "real_first");
  assert.equal(manifest.items[0].generation_mode, "real_photo");
  assert.equal(manifest.items[1].generation_mode, "hybrid");
  assert.equal(manifest.items[2].generation_mode, "ai_generated");
});

test("manifest pipeline preserves source_preference and routes generation_mode to the correct executor", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-integration-"));
  const outputRoot = path.join(tempDir, "output");

  const result = await runManifestPipeline(fixturePath, { outputRoot });

  assert.equal(result.tasks.length, 3);
  assert.equal(result.tasks[0].source_preference, "real_first");
  assert.equal(result.tasks[1].source_preference, "hybrid_first");
  assert.equal(result.tasks[2].source_preference, "generated_first");

  assert.equal(result.tasks[0].generation_mode, "real_photo");
  assert.equal(result.tasks[1].generation_mode, "hybrid");
  assert.equal(result.tasks[2].generation_mode, "ai_generated");

  const realPhotoAsset = result.imageAssets.find((item) => item.asset_id === "sample_real_photo_asset");
  const hybridAsset = result.imageAssets.find((item) => item.asset_id === "sample_hybrid_asset");
  const aiAsset = result.imageAssets.find((item) => item.asset_id === "sample_ai_generated_asset");

  assert.ok(realPhotoAsset);
  assert.ok(hybridAsset);
  assert.ok(aiAsset);

  assert.equal(realPhotoAsset.image_asset.source, "wikimedia");
  assert.equal(realPhotoAsset.image_asset.status, "completed");
  assert.equal(realPhotoAsset.image_asset.file_path, "mock://integration/sample_real_photo_asset.jpg");

  assert.equal(hybridAsset.image_asset.source, "hybrid");
  assert.equal(hybridAsset.image_asset.status, "completed");

  assert.equal(aiAsset.image_asset.source, "ai_generated");
  assert.equal(aiAsset.image_asset.status, "failed");
  assert.equal(aiAsset.image_asset.file_path, "");
  assert.equal(aiAsset.image_asset.reason, "ai_generated_executor_error");
});

test("manifest integration writes image_asset outputs successfully", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-integration-write-"));
  const outputRoot = path.join(tempDir, "output");
  const result = await runManifestPipeline(fixturePath, { outputRoot });

  const realPhotoPath = path.join(result.runDir, "assets", "sample_real_photo_asset_explore_cover.image_asset.json");
  const hybridPath = path.join(result.runDir, "assets", "sample_hybrid_asset_section_inline.image_asset.json");
  const aiPath = path.join(result.runDir, "assets", "sample_ai_generated_asset_detail_header.image_asset.json");

  assert.ok(fs.existsSync(realPhotoPath));
  assert.ok(fs.existsSync(hybridPath));
  assert.ok(fs.existsSync(aiPath));

  const realPhotoAsset = JSON.parse(fs.readFileSync(realPhotoPath, "utf8"));
  const hybridAsset = JSON.parse(fs.readFileSync(hybridPath, "utf8"));
  const aiAsset = JSON.parse(fs.readFileSync(aiPath, "utf8"));

  assert.equal(realPhotoAsset.asset_id, "sample_real_photo_asset");
  assert.equal(realPhotoAsset.asset_instance_id, "sample_real_photo_asset_explore_cover");
  assert.equal(realPhotoAsset.status, "completed");
  assert.equal(hybridAsset.asset_id, "sample_hybrid_asset");
  assert.equal(hybridAsset.asset_instance_id, "sample_hybrid_asset_section_inline");
  assert.equal(hybridAsset.source, "hybrid");
  assert.equal(aiAsset.asset_id, "sample_ai_generated_asset");
  assert.equal(aiAsset.asset_instance_id, "sample_ai_generated_asset_detail_header");
  assert.equal(aiAsset.source, "ai_generated");
  assert.equal(aiAsset.status, "failed");
});
