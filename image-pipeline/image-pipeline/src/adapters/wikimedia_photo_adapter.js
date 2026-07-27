const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");

const { parseExtMetadata } = require("../license/asset_license_parser");

const WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php";
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

function resolveProxyAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (!proxyUrl) {
    return undefined;
  }

  return new HttpsProxyAgent(proxyUrl);
}

function requestJson(url, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const agent = resolveProxyAgent();
    const request = https
      .get(url, {
        agent,
        headers: {
          "User-Agent": "WanderlyImagePipeline/1.0 (manifest-driven real photo adapter)"
        }
      }, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Wikimedia request failed with status ${response.statusCode}.`));
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
            reject(new Error(`Failed to parse Wikimedia response JSON: ${error.message}`));
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Wikimedia request timed out after ${timeoutMs}ms.`));
    });
  });
}

function buildSearchUrl(query) {
  const url = new URL(WIKIMEDIA_API_URL);

  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata|size|mime");
  url.searchParams.set("iiurlwidth", "1600");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  return url.toString();
}

function normalizeSearchResult(page, query) {
  const imageInfo = Array.isArray(page.imageinfo) ? page.imageinfo[0] : undefined;
  const licenseInfo = parseExtMetadata(imageInfo && imageInfo.extmetadata);
  const imageUrl = imageInfo && (imageInfo.thumburl || imageInfo.url);
  const description = imageInfo && imageInfo.extmetadata && imageInfo.extmetadata.ImageDescription
    ? imageInfo.extmetadata.ImageDescription.value
    : "";

  return {
    query,
    title: page.title,
    description,
    url: imageUrl,
    width: imageInfo && (imageInfo.thumbwidth || imageInfo.width),
    height: imageInfo && (imageInfo.thumbheight || imageInfo.height),
    mime_type: imageInfo && imageInfo.mime,
    author: licenseInfo.author,
    license: licenseInfo.license,
    license_url: licenseInfo.license_url,
    usage_terms: licenseInfo.usage_terms,
    source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
  };
}

async function searchWikimediaPhotos(query) {
  if (!query || typeof query !== "string") {
    throw new Error("query must be a string.");
  }

  const data = await requestJson(buildSearchUrl(query));
  const pages = data && data.query && data.query.pages
    ? Object.values(data.query.pages)
    : [];

  return pages
    .map((page) => normalizeSearchResult(page, query))
    .filter((item) => item.url);
}

module.exports = {
  searchWikimediaPhotos
};
