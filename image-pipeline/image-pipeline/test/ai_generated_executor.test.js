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

test("executeAssetTask routes cover ai_generated tasks through Seedream and writes a real file path", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-generated-seedream-"));
  const restoreState = {};
  const originalFetch = global.fetch;

  setEnv("ARK_API_KEY", "test-key", restoreState);
  setEnv("ARK_BASE_URL", "https://seedream.test", restoreState);
  setEnv("ARK_IMAGE_ENDPOINT", "/api/v3/images/generations", restoreState);
  setEnv("ARK_MODEL_ID", "test-seedream-model", restoreState);

  global.fetch = async (url, options) => {
    assert.equal(url, "https://seedream.test/api/v3/images/generations");
    assert.equal(options.method, "POST");
    assert.match(options.headers.Authorization, /^Bearer /);

    const requestBody = JSON.parse(options.body);
    assert.equal(requestBody.model, "test-seedream-model");
    assert.equal(requestBody.response_format, "b64_json");
    assert.match(requestBody.prompt, /Misty Hangzhou cover/);

    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          id: "seedream_test_request_1",
          data: [
            {
              b64_json: tinyPngBase64,
              revised_prompt: "Misty Hangzhou cover revised prompt"
            }
          ]
        });
      }
    };
  };

  try {
    const result = await executeAssetTask({
      task_id: "task_hangzhou_cover_explore_cover",
      asset_id: "hangzhou_cover",
      asset_instance_id: "hangzhou_cover_explore_cover",
      manifest_id: "manifest_ai_generated_seedream_test",
      image_slot: "explore_cover",
      type: "image",
      source_preference: "generated_first",
      mode: "ai_generated",
      generation_mode: "ai_generated",
      decision_reason: "Cover should preserve Wanderly style.",
      prompt: "Misty Hangzhou cover.",
      metadata: {
        generated_output_dir: tempDir,
        location_context: {
          city: "Hangzhou",
          country: "China",
          poi: "West Lake"
        }
      },
      status: "pending"
    });

    assert.equal(result.image_asset.source, "ai_generated");
    assert.equal(result.image_asset.status, "completed");
    assert.ok(result.image_asset.file_path);
    assert.equal(result.image_asset.file_path.startsWith("mock://"), false);
    assert.ok(fs.existsSync(result.image_asset.file_path));
    assert.equal(result.image_asset.metadata.provider_id, "seedream");
    assert.equal(result.image_asset.metadata.model_id, "test-seedream-model");
    assert.equal(result.image_asset.metadata.provider_job_id, "seedream_hangzhou_cover_explore_cover");
    assert.match(result.image_asset.metadata.prompt, /Misty Hangzhou cover/);
  } finally {
    global.fetch = originalFetch;
    restoreEnv(restoreState);
  }
});
