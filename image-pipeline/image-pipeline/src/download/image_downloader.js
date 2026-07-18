const fs = require("fs");
const path = require("path");
const https = require("https");

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 20000;
const RETRY_DELAYS_MS = [3000, 8000, 15000];
let downloadQueue = Promise.resolve();
const DEFAULT_DOWNLOAD_HEADERS = {
  "User-Agent": "WanderlyImagePipeline/1.0 (real photo downloader)",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  Referer: "https://www.pexels.com/"
};

function inferExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);

    return extension || ".jpg";
  } catch (_error) {
    return ".jpg";
  }
}

function sleep(delayMs, sleepFn) {
  if (typeof sleepFn === "function") {
    return sleepFn(delayMs);
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createDownloadError(message, details = {}) {
  const error = new Error(message);

  for (const [key, value] of Object.entries(details)) {
    error[key] = value;
  }

  return error;
}

function queueDownload(executor) {
  const nextRun = downloadQueue.then(executor, executor);

  downloadQueue = nextRun.catch(() => {});

  return nextRun;
}

function requestBinary(url, options = {}) {
  const requestFn = options.requestFn || https.get;
  const timeoutMs = options.timeoutMs || DEFAULT_DOWNLOAD_TIMEOUT_MS;
  const headers = {
    ...DEFAULT_DOWNLOAD_HEADERS,
    ...(options.headers || {})
  };

  return new Promise((resolve, reject) => {
    const request = requestFn(
      url,
      {
        headers
      },
      (response) => {
        resolve(response);
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Image download timed out after ${timeoutMs}ms.`));
    });
  });
}

function cleanupFailedOutput(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch (_error) {
    // Best effort cleanup only.
  }
}

async function performSingleDownload(asset, outputPath, options = {}) {
  const response = await requestBinary(asset.url, options);

  if (response.statusCode === 429) {
    response.resume();
    throw createDownloadError("Image download failed with status 429.", {
      statusCode: 429
    });
  }

  if (response.statusCode && response.statusCode >= 400) {
    response.resume();
    throw createDownloadError(`Image download failed with status ${response.statusCode}.`, {
      statusCode: response.statusCode
    });
  }

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    response.pipe(file);

    file.on("finish", () => {
      file.close(resolve);
    });

    file.on("error", (error) => {
      file.close(() => {
        cleanupFailedOutput(outputPath);
        reject(error);
      });
    });

    response.on("error", (error) => {
      file.close(() => {
        cleanupFailedOutput(outputPath);
        reject(error);
      });
    });
  });
}

function downloadImage(asset, options = {}) {
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
    throw new Error("asset must be an object.");
  }

  if (!asset.url || typeof asset.url !== "string") {
    throw new Error("asset.url must be a string.");
  }

  const outputDir = options.outputDir || path.join(process.cwd(), "assets", "external");
  const fileName = `${asset.asset_id || "external_asset"}${inferExtension(asset.url)}`;
  const outputPath = path.resolve(outputDir, fileName);
  const timeoutMs = options.timeoutMs || DEFAULT_DOWNLOAD_TIMEOUT_MS;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  return queueDownload(async () => {
    let retryCount = 0;
    let lastError = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await performSingleDownload(asset, outputPath, {
          timeoutMs,
          requestFn: options.requestFn
        });

        return {
          filePath: outputPath,
          retryCount,
          lastError,
          downloadStatus: "completed"
        };
      } catch (error) {
        lastError = error && error.message ? error.message : String(error);

        if (error && error.statusCode === 429 && attempt < RETRY_DELAYS_MS.length) {
          retryCount += 1;
          cleanupFailedOutput(outputPath);
          await sleep(RETRY_DELAYS_MS[attempt], options.sleepFn);
          continue;
        }

        cleanupFailedOutput(outputPath);
        throw createDownloadError(lastError, {
          statusCode: error && error.statusCode ? error.statusCode : null,
          retryCount,
          lastError,
          downloadStatus: "failed"
        });
      }
    }

    throw createDownloadError(lastError || "Image download failed.", {
      retryCount,
      lastError,
      downloadStatus: "failed"
    });
  });
}

module.exports = {
  downloadImage,
  inferExtension,
  requestBinary,
  performSingleDownload,
  DEFAULT_DOWNLOAD_HEADERS
};
