const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { readImageManifest } = require("../src/manifest/read_image_manifest");
const { buildAssetTasks } = require("../src/tasks/build_asset_tasks");
const { runManifestPipeline } = require("../src/pipeline/run_manifest_pipeline");

test("readImageManifest extracts standard task-driving fields", () => {
  const manifest = {
    manifest_id: "manifest_explore_xian",
    assets: [
      {
        asset_id: "forbidden_city",
        image_slot: "explore_cover",
        type: "image",
        source_preference: "real_first",
        generation_mode: "real_photo",
        decision_reason: "Historic place should prioritize realism.",
        prompt: "Forbidden City at soft morning light."
      }
    ]
  };

  const parsed = readImageManifest(manifest);

  assert.equal(parsed.manifest_id, "manifest_explore_xian");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].asset_id, "forbidden_city");
  assert.equal(parsed.items[0].image_slot, "explore_cover");
  assert.equal(parsed.items[0].source_preference, "real_first");
  assert.equal(parsed.items[0].generation_mode, "real_photo");
});

test("readImageManifest preserves upstream search and location metadata", () => {
  const manifest = {
    manifest_id: "manifest_metadata_test",
    assets: [
      {
        asset_id: "forbidden_city",
        image_slot: "explore_cover",
        type: "image",
        source_preference: "real_first",
        generation_mode: "real_photo",
        decision_reason: "Historic place should prioritize realism.",
        prompt: "Forbidden City at soft morning light.",
        search_keywords: ["Forbidden City Beijing", "Palace Museum Beijing"],
        location_context: {
          city: "beijing",
          district: "Dongcheng",
          poi: "Forbidden City",
          keywords: ["Forbidden City Beijing", "Forbidden City courtyard"]
        },
        visual_subject: {
          main_subject: "historic palace architecture",
          secondary_elements: ["courtyard", "red walls"]
        }
      }
    ]
  };

  const parsed = readImageManifest(manifest);

  assert.deepEqual(parsed.items[0].metadata.search_keywords, ["Forbidden City Beijing", "Palace Museum Beijing"]);
  assert.equal(parsed.items[0].metadata.location_context.city, "beijing");
  assert.equal(parsed.items[0].metadata.visual_subject.main_subject, "historic palace architecture");
});

test("buildAssetTasks converts manifest items into internal tasks", () => {
  const manifest = {
    manifest_id: "manifest_cover_test",
    items: [
      {
        asset_id: "hangzhou_cover",
        image_slot: "explore_cover",
        type: "image",
        source_preference: "generated_first",
        generation_mode: "ai_generated",
        decision_reason: "Cover should preserve Wanderly style.",
        prompt: "Misty Hangzhou cover."
      }
    ]
  };

  const parsed = readImageManifest(manifest);
  const tasks = buildAssetTasks(parsed);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].task_id, "task_hangzhou_cover_explore_cover");
  assert.equal(tasks[0].asset_id, "hangzhou_cover");
  assert.equal(tasks[0].asset_instance_id, "hangzhou_cover_explore_cover");
  assert.equal(tasks[0].mode, "ai_generated");
  assert.equal(tasks[0].status, "pending");
});

test("runManifestPipeline creates asset tasks and image_asset outputs for Beijing Golden Sample", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-pipeline-"));
  const manifestPath = path.join(tempDir, "image_manifest.json");
  const outputRoot = path.join(tempDir, "output");

  const manifest = {
    manifest_id: "manifest_beijing_golden_sample",
    trip_id: "trip_beijing_001",
    assets: [
      {
        asset_id: "forbidden_city",
        image_slot: "explore_cover",
        type: "image",
        source_preference: "generated_first",
        generation_mode: "real_photo",
        decision_reason: "Forbidden City should prioritize realism.",
        prompt: "Forbidden City in soft morning light.",
        metadata: {
          mock_download_file_path: path.join(outputRoot, "mock-assets", "forbidden_city.jpg"),
          photo_candidates: [
            {
              title: "Forbidden City Beijing architecture view",
              description: "travel architecture landscape of the Forbidden City in Beijing",
              width: 3200,
              height: 2100,
              mime_type: "image/jpeg",
              url: "https://example.com/forbidden-city.jpg",
              license: "CC0",
              author: "Example Author",
              source_url: "https://commons.wikimedia.org/wiki/File:Forbidden_City.jpg"
            }
          ]
        }
      },
      {
        asset_id: "white_pagoda_temple",
        image_slot: "place_gallery",
        type: "image",
        source_preference: "hybrid_first",
        generation_mode: "hybrid",
        decision_reason: "White Pagoda Temple needs both documentary structure and branded atmosphere.",
        prompt: "White Pagoda Temple with calm editorial atmosphere.",
        metadata: {
          image_usage_profile: "place",
          photo_source_candidates: [
            {
              source: "mock_gallery",
              priority: 1
            }
          ],
          mock_photo_sources: {
            mock_gallery: {
              download_file_path: path.join(outputRoot, "mock-assets", "white_pagoda_temple.jpg"),
              candidates: [
                {
                  title: "White Pagoda Temple Beijing architecture",
                  description: "travel architecture landscape of White Pagoda Temple in Beijing",
                  width: 3200,
                  height: 2100,
                  mime_type: "image/jpeg",
                  url: "https://example.com/white-pagoda-temple.jpg",
                  license: "CC0",
                  author: "Example Author",
                  source_url: "https://example.com/white-pagoda-temple"
                }
              ]
            }
          }
        }
      },
      {
        asset_id: "art_zone_798",
        image_slot: "section_inline",
        type: "image",
        source_preference: "generated_first",
        generation_mode: "ai_generated",
        decision_reason: "798 can lean into branded editorial interpretation.",
        prompt: "798 Art District with contemporary creative tone."
      }
    ]
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const result = await runManifestPipeline(manifestPath, { outputRoot });

  assert.equal(result.manifest.manifest_id, "manifest_beijing_golden_sample");
  assert.equal(result.tasks.length, 3);
  assert.equal(result.executionResults.length, 3);
  assert.equal(result.summary.completed_count, 2);

  const firstAssetPath = path.join(result.runDir, "assets", "forbidden_city_explore_cover.image_asset.json");
  const secondAssetPath = path.join(result.runDir, "assets", "white_pagoda_temple_place_gallery.image_asset.json");
  const thirdAssetPath = path.join(result.runDir, "assets", "art_zone_798_section_inline.image_asset.json");

  assert.ok(fs.existsSync(firstAssetPath));
  assert.ok(fs.existsSync(secondAssetPath));
  assert.ok(fs.existsSync(thirdAssetPath));

  const firstAsset = JSON.parse(fs.readFileSync(firstAssetPath, "utf8"));
  const secondAsset = JSON.parse(fs.readFileSync(secondAssetPath, "utf8"));
  const thirdAsset = JSON.parse(fs.readFileSync(thirdAssetPath, "utf8"));

  assert.equal(firstAsset.asset_id, "forbidden_city");
  assert.equal(firstAsset.asset_instance_id, "forbidden_city_explore_cover");
  assert.equal(firstAsset.image_slot, "explore_cover");
  assert.equal(firstAsset.source, "wikimedia");
  assert.equal(firstAsset.status, "completed");
  assert.equal(secondAsset.asset_instance_id, "white_pagoda_temple_place_gallery");
  assert.equal(secondAsset.source, "hybrid");
  assert.equal(secondAsset.status, "completed");
  assert.equal(thirdAsset.asset_instance_id, "art_zone_798_section_inline");
  assert.equal(thirdAsset.source, "ai_generated");
  assert.equal(thirdAsset.status, "failed");
  assert.equal(thirdAsset.file_path, "");

  assert.deepEqual(
    result.executionResults[0].task_state.history.map((entry) => entry.status),
    ["pending", "processing", "completed"]
  );
  assert.deepEqual(
    result.executionResults[1].task_state.history.map((entry) => entry.status),
    ["pending", "processing", "completed"]
  );
  assert.deepEqual(
    result.executionResults[2].task_state.history.map((entry) => entry.status),
    ["pending", "processing", "failed"]
  );
});

test("runManifestPipeline writes separate image_asset outputs for same asset_id with different image_slot", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-pipeline-instance-"));
  const manifestPath = path.join(tempDir, "image_manifest.json");
  const outputRoot = path.join(tempDir, "output");

  const manifest = {
    manifest_id: "manifest_duplicate_asset_id",
    assets: [
      {
        asset_id: "jingshan_park",
        image_slot: "section_inline",
        type: "image",
        source_preference: "generated_first",
        generation_mode: "ai_generated",
        decision_reason: "Inline generated asset",
        prompt: "Jingshan Park inline."
      },
      {
        asset_id: "jingshan_park",
        image_slot: "poi_gallery",
        type: "image",
        source_preference: "generated_first",
        generation_mode: "ai_generated",
        decision_reason: "Gallery asset",
        prompt: "Jingshan Park gallery."
      }
    ]
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const result = await runManifestPipeline(manifestPath, { outputRoot });
  const coverPath = path.join(result.runDir, "assets", "jingshan_park_section_inline.image_asset.json");
  const galleryPath = path.join(result.runDir, "assets", "jingshan_park_poi_gallery.image_asset.json");

  assert.ok(fs.existsSync(coverPath));
  assert.ok(fs.existsSync(galleryPath));
  assert.notEqual(coverPath, galleryPath);

  const coverAsset = JSON.parse(fs.readFileSync(coverPath, "utf8"));
  const galleryAsset = JSON.parse(fs.readFileSync(galleryPath, "utf8"));

  assert.equal(coverAsset.asset_id, "jingshan_park");
  assert.equal(coverAsset.asset_instance_id, "jingshan_park_section_inline");
  assert.equal(coverAsset.image_slot, "section_inline");
  assert.equal(galleryAsset.asset_id, "jingshan_park");
  assert.equal(galleryAsset.asset_instance_id, "jingshan_park_poi_gallery");
  assert.equal(galleryAsset.image_slot, "poi_gallery");
});
