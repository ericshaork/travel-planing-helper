const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");

const { downloadImage, DEFAULT_DOWNLOAD_HEADERS } = require("../src/download/image_downloader");
const { executeAssetTask } = require("../src/executor/execute_asset_task");

function createRequestFn(statusCodes, body, observer) {
  let callIndex = 0;

  return (url, options, callback) => {
    if (typeof observer === "function") {
      observer({ url, options, attempt: callIndex });
    }

    const request = new EventEmitter();
    const statusCode = statusCodes[Math.min(callIndex, statusCodes.length - 1)];

    callIndex += 1;

    request.setTimeout = (_timeout, handler) => {
      request._timeoutHandler = handler;
    };
    request.destroy = (error) => {
      if (error) {
        request.emit("error", error);
      }
    };

    process.nextTick(() => {
      const response = new PassThrough();

      response.statusCode = statusCode;
      response.headers = { "content-type": "image/jpeg" };
      response.resume = () => {
        response.emit("end");
      };

      callback(response);

      if (statusCode < 400) {
        response.end(body || "mock-image-bytes");
      } else {
        response.resume();
      }
    });

    return request;
  };
}

test("downloadImage sends CDN-compatible headers", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-downloader-headers-"));
  const seen = [];

  const result = await downloadImage(
    {
      asset_id: "forbidden_city",
      url: "https://images.pexels.com/photos/123/forbidden-city.jpeg"
    },
    {
      outputDir: tempDir,
      requestFn: createRequestFn([200], "jpeg-binary", (request) => {
        seen.push(request.options.headers);
      })
    }
  );

  assert.ok(fs.existsSync(result.filePath));
  assert.equal(seen.length, 1);
  assert.equal(seen[0]["User-Agent"], DEFAULT_DOWNLOAD_HEADERS["User-Agent"]);
  assert.equal(seen[0].Accept, DEFAULT_DOWNLOAD_HEADERS.Accept);
  assert.equal(seen[0].Referer, DEFAULT_DOWNLOAD_HEADERS.Referer);
});

test("download failure still preserves selected candidate info in image_asset", async () => {
  const slept = [];

  const result = await executeAssetTask({
    task_id: "task_forbidden_city_explore_cover",
    asset_id: "forbidden_city",
    asset_instance_id: "forbidden_city_explore_cover",
    image_slot: "explore_cover",
    type: "place",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Forbidden City Beijing architecture",
    metadata: {
      location: "Beijing",
      photo_source_candidates: [
        {
          source: "pexels",
          priority: 1
        }
      ],
      mock_photo_sources: {
        pexels: {
          candidates: [
            {
              source: "pexels",
              candidate_id: "98765",
              image_url: "https://images.pexels.com/photos/98765/forbidden-city.jpeg",
              url: "https://images.pexels.com/photos/98765/forbidden-city.jpeg",
              title: "Forbidden City Beijing architecture",
              description: "travel architecture landscape photo",
              width: 3200,
              height: 2000,
              mime_type: "image/jpeg",
              license: "Pexels License"
            }
          ]
        }
      },
      download_request_options: {
        requestFn: createRequestFn([429, 429, 429, 429]),
        sleepFn: async (delayMs) => {
          slept.push(delayMs);
        }
      }
    }
  });

  assert.equal(result.image_asset.status, "failed");
  assert.equal(result.image_asset.reason, "real_photo_executor_error");
  assert.equal(result.image_asset.retry_count, 3);
  assert.equal(result.image_asset.download_status, "failed");
  assert.equal(result.image_asset.last_error, "Image download failed with status 429.");
  assert.deepEqual(slept, [3000, 8000, 15000]);
  assert.deepEqual(result.image_asset.selection.selected_candidate, {
    source: "pexels",
    candidate_id: "98765",
    image_url: "https://images.pexels.com/photos/98765/forbidden-city.jpeg"
  });
});
