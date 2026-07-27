const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { executeAssetTask } = require("../src/executor/execute_asset_task");

const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function setEnv(key, value, restoreState) {
  restoreState[key] = Object.prototype.hasOwnProperty.call(process.env, key)
    ? process.env[key]
    : undefined;
  process.env[key] = value;
}

function restoreEnv(restoreState) {
  for (const [key, value] of Object.entries(restoreState)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

test("hybrid experience day_cover uses Seedream fallback when real-photo stage has no usable result", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hybrid-seedream-"));
  const restoreState = {};
  const originalFetch = global.fetch;

  setEnv("ARK_API_KEY", "test-key", restoreState);
  setEnv("ARK_BASE_URL", "https://seedream.test", restoreState);
  setEnv("ARK_IMAGE_ENDPOINT", "/api/v3/images/generations", restoreState);
  setEnv("ARK_MODEL_ID", "test-seedream-model", restoreState);

  global.fetch = async (url, options) => {
    assert.equal(url, "https://seedream.test/api/v3/images/generations");
    assert.equal(options.method, "POST");

    const requestBody = JSON.parse(options.body);
    assert.equal(requestBody.response_format, "b64_json");
    assert.match(requestBody.prompt, /Liangma River/);

    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          id: "seedream_hybrid_test_request_1",
          data: [
            {
              b64_json: tinyPngBase64
            }
          ]
        });
      }
    };
  };

  try {
    const result = await executeAssetTask({
      task_id: "task_ca_beijing_liangma_river_day_cover",
      asset_id: "ca_beijing_liangma_river",
      asset_instance_id: "ca_beijing_liangma_river_day_cover",
      manifest_id: "manifest_hybrid_executor_test",
      image_slot: "day_cover",
      type: "experience",
      source_preference: "mixed",
      mode: "hybrid",
      generation_mode: "hybrid",
      decision_reason: "Evening closure needs real place sense and generated mood support.",
      prompt: "Liangma River evening closure cover with warm lights and relaxed waterside walking.",
      metadata: {
        image_usage_profile: "experience",
        generated_output_dir: tempDir,
        photo_source_candidates: [
          {
            source: "mock_gallery",
            priority: 1
          }
        ],
        mock_photo_sources: {
          mock_gallery: {
            candidates: []
          }
        },
        location_context: {
          city: "Beijing",
          country: "China",
          poi: "Liangma River"
        }
      },
      status: "pending"
    });

    assert.equal(result.image_asset.source, "hybrid");
    assert.equal(result.image_asset.status, "completed");
    assert.ok(result.image_asset.file_path);
    assert.equal(result.image_asset.file_path.startsWith("mock://"), false);
    assert.ok(fs.existsSync(result.image_asset.file_path));
    assert.equal(result.image_asset.metadata.strategy, "real_photo_first_ai_fallback");
    assert.equal(result.image_asset.metadata.resolved_via, "ai_fallback");
    assert.equal(result.image_asset.metadata.real_photo.status, "failed");
    assert.equal(result.image_asset.metadata.ai_fallback.status, "completed");
  } finally {
    global.fetch = originalFetch;
    restoreEnv(restoreState);
  }
});
