const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");

const { downloadImage } = require("../src/download/image_downloader");

function createRequestFn(statusCodes, body) {
  let callIndex = 0;

  return (url, options, callback) => {
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

test("downloadImage retries 429 and succeeds", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-downloader-retry-"));
  const slept = [];
  const result = await downloadImage(
    {
      asset_id: "forbidden_city",
      url: "https://example.com/forbidden-city.jpg"
    },
    {
      outputDir: tempDir,
      requestFn: createRequestFn([429, 200], "jpeg-binary"),
      sleepFn: async (delayMs) => {
        slept.push(delayMs);
      }
    }
  );

  assert.equal(result.downloadStatus, "completed");
  assert.equal(result.retryCount, 1);
  assert.equal(result.lastError, "Image download failed with status 429.");
  assert.ok(fs.existsSync(result.filePath));
  assert.deepEqual(slept, [3000]);
});

test("downloadImage returns failed metadata after repeated 429 responses", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-downloader-fail-"));
  const slept = [];

  await assert.rejects(
    () => downloadImage(
      {
        asset_id: "beihai_park",
        url: "https://example.com/beihai-park.jpg"
      },
      {
        outputDir: tempDir,
        requestFn: createRequestFn([429, 429, 429, 429]),
        sleepFn: async (delayMs) => {
          slept.push(delayMs);
        }
      }
    ),
    (error) => {
      assert.equal(error.retryCount, 3);
      assert.equal(error.lastError, "Image download failed with status 429.");
      assert.equal(error.downloadStatus, "failed");
      return true;
    }
  );

  assert.deepEqual(slept, [3000, 8000, 15000]);
});

test("downloadImage succeeds normally without retry", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-downloader-success-"));
  const result = await downloadImage(
    {
      asset_id: "jingshan_park",
      url: "https://example.com/jingshan-park.jpg"
    },
    {
      outputDir: tempDir,
      requestFn: createRequestFn([200], "plain-success")
    }
  );

  assert.equal(result.downloadStatus, "completed");
  assert.equal(result.retryCount, 0);
  assert.equal(result.lastError, null);
  assert.ok(fs.existsSync(result.filePath));
});
