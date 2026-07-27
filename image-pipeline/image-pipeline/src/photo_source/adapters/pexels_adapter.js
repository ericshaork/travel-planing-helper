const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");

const { downloadImage } = require("../../download/image_downloader");
const { validateImageCandidate } = require("../../validation/image_validator");
const { rankPhotos } = require("../../ranking/photo_ranker");
const { loadEnv } = require("../../config/load_env");

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const DEFAULT_PEXELS_TIMEOUT_MS = 15000;

function resolveProxyAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (!proxyUrl) {
    return undefined;
  }

  return new HttpsProxyAgent(proxyUrl);
}

function buildRankingContext(task) {
  return {
    asset_id: task.asset_id,
    prompt: task.prompt,
    location: task.metadata && task.metadata.location,
    asset_role: task.image_slot
  };
}

function sanitizeQueryValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-_,]/gu, " ")
    .trim();
}

function buildPexelsQueries(task, context = {}) {
  const metadata = task.metadata || {};
  const values = [];

  if (metadata.location_context && Array.isArray(metadata.location_context.keywords)) {
    values.push(...metadata.location_context.keywords);
  } else if (typeof metadata.location_context === "string") {
    values.push(metadata.location_context);
  }

  if (Array.isArray(metadata.search_keywords)) {
    values.push(...metadata.search_keywords);
  }

  if (metadata.visual_subject) {
    values.push(metadata.visual_subject);
  }

  if (metadata.asset_name) {
    values.push(metadata.asset_name);
  }

  if (task.prompt) {
    values.push(task.prompt);
  }

  if (Array.isArray(context.queries)) {
    values.push(...context.queries);
  }

  return values
    .map((value) => sanitizeQueryValue(value))
    .filter(Boolean);
}

function buildPexelsSearchQuery(task, context = {}) {
  const queries = buildPexelsQueries(task, context);

  if (queries.length === 0) {
    return "";
  }

  return queries[0];
}

function buildPexelsSearchUrl(query) {
  const url = new URL(PEXELS_SEARCH_URL);

  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("orientation", "landscape");

  return url.toString();
}

function requestPexelsJson(url, apiKey, timeoutMs = DEFAULT_PEXELS_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const agent = resolveProxyAgent();
    const request = https
      .get(url, {
        agent,
        headers: {
          Authorization: apiKey,
          "User-Agent": "WanderlyImagePipeline/1.0 (pexels real photo adapter)"
        }
      }, (response) => {
        if (response.statusCode === 401 || response.statusCode === 403) {
          reject(new Error(`Pexels authentication failed with status ${response.statusCode}.`));
          response.resume();
          return;
        }

        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Pexels request failed with status ${response.statusCode}.`));
          response.resume();
          return;
        }

        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error(`Failed to parse Pexels response JSON: ${error.message}`));
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Pexels request timed out after ${timeoutMs}ms.`));
    });
  });
}

function normalizePexelsPhoto(photo) {
  const imageUrl = photo && photo.src
    ? (photo.src.large2x || photo.src.large || photo.src.original || photo.src.medium)
    : "";

  return {
    source: "pexels",
    candidate_id: String(photo && photo.id ? photo.id : ""),
    image_url: imageUrl,
    url: imageUrl,
    width: photo && photo.width,
    height: photo && photo.height,
    title: photo && photo.alt ? photo.alt : "",
    description: photo && photo.alt ? photo.alt : "",
    mime_type: "image/jpeg",
    metadata: {
      author: photo && photo.photographer ? photo.photographer : "",
      license: "Pexels License",
      source_url: photo && photo.url ? photo.url : ""
    },
    author: photo && photo.photographer ? photo.photographer : "",
    license: "Pexels License",
    source_url: photo && photo.url ? photo.url : ""
  };
}

function createPexelsAdapter() {
  return {
    source: "pexels",
    async search(task, context = {}) {
      const sourceConfig = task.metadata
        && task.metadata.mock_photo_sources
        && task.metadata.mock_photo_sources.pexels
        ? task.metadata.mock_photo_sources.pexels
        : null;

      if (sourceConfig) {
        if (sourceConfig.error) {
          return {
            source: "pexels",
            candidates: [],
            error: sourceConfig.error
          };
        }

        if (sourceConfig.raw_response) {
          const normalized = Array.isArray(sourceConfig.raw_response.photos)
            ? sourceConfig.raw_response.photos.map((photo) => normalizePexelsPhoto(photo)).filter((candidate) => candidate.url)
            : [];

          return {
            source: "pexels",
            candidates: normalized,
            error: null,
            queries: buildPexelsQueries(task, context)
          };
        }

        return {
          source: "pexels",
          candidates: Array.isArray(sourceConfig.candidates) ? sourceConfig.candidates : [],
          error: null,
          queries: buildPexelsQueries(task, context)
        };
      }

      loadEnv();
      const apiKey = typeof context.apiKey === "string"
        ? context.apiKey
        : process.env.PEXELS_API_KEY;

      if (!apiKey) {
        return {
          source: "pexels",
          candidates: [],
          error: "missing_pexels_api_key",
          queries: buildPexelsQueries(task, context)
        };
      }

      const query = buildPexelsSearchQuery(task, context);

      if (!query) {
        return {
          source: "pexels",
          candidates: [],
          error: "missing_pexels_search_query",
          queries: []
        };
      }

      if (sourceConfig && sourceConfig.raw_response) {
        const normalized = Array.isArray(sourceConfig.raw_response.photos)
          ? sourceConfig.raw_response.photos.map((photo) => normalizePexelsPhoto(photo)).filter((candidate) => candidate.url)
          : [];

        return {
          source: "pexels",
          candidates: normalized,
          error: null,
          queries: [query]
        };
      }

      const response = await requestPexelsJson(buildPexelsSearchUrl(query), apiKey);
      const candidates = Array.isArray(response.photos)
        ? response.photos.map((photo) => normalizePexelsPhoto(photo)).filter((candidate) => candidate.url)
        : [];

      return {
        source: "pexels",
        candidates,
        error: null,
        queries: [query]
      };
    },
    validate(candidate) {
      return validateImageCandidate(candidate);
    },
    rank(candidates, task) {
      return rankPhotos(candidates, buildRankingContext(task));
    },
    async download(candidate, task) {
      const sourceConfig = task.metadata
        && task.metadata.mock_photo_sources
        && task.metadata.mock_photo_sources.pexels
        ? task.metadata.mock_photo_sources.pexels
        : {};

      if (sourceConfig.download_file_path) {
        return sourceConfig.download_file_path;
      }

      if (task.metadata && task.metadata.mock_download_file_path) {
        return task.metadata.mock_download_file_path;
      }

      return downloadImage(candidate, {
        outputDir: task.metadata && task.metadata.download_output_dir,
        ...(task.metadata && task.metadata.download_request_options
          ? task.metadata.download_request_options
          : {})
      });
    }
  };
}

module.exports = {
  createPexelsAdapter,
  buildPexelsQueries,
  buildPexelsSearchQuery,
  buildPexelsSearchUrl,
  normalizePexelsPhoto
};
