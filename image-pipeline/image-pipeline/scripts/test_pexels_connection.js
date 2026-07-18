const https = require("https");

const { loadEnv } = require("../src/config/load_env");

const REQUEST_URL = "https://api.pexels.com/v1/search?query=Forbidden%20City%20Beijing";

function truncate(value, limit = 500) {
  if (typeof value !== "string") {
    return "";
  }

  if (value.length <= limit) {
    return value;
  }

  return value.slice(0, limit);
}

function pickHeaders(headers) {
  if (!headers || typeof headers !== "object") {
    return {};
  }

  const keys = [
    "content-type",
    "content-length",
    "date",
    "server",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "cf-cache-status",
    "cf-ray"
  ];
  const selected = {};

  for (const key of keys) {
    if (headers[key]) {
      selected[key] = headers[key];
    }
  }

  return selected;
}

function requestPexels(url, apiKey) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Authorization: apiKey,
          "User-Agent": "WanderlyImagePipeline/1.0 (pexels connection test)"
        }
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          raw += chunk;
        });

        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || null,
            headers: response.headers,
            body: raw
          });
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(15000, () => {
      request.destroy(new Error("Pexels connection test timed out after 15000ms."));
    });
  });
}

async function main() {
  const config = loadEnv();
  const apiKey = config.pexels && config.pexels.apiKey ? config.pexels.apiKey : "";

  console.log("request url:");
  console.log(REQUEST_URL);
  console.log("");

  console.log("key loaded:");
  console.log(apiKey ? "yes" : "no");
  console.log("");

  try {
    const response = await requestPexels(REQUEST_URL, apiKey);

    console.log("http status code:");
    console.log(response.statusCode);
    console.log("");

    console.log("response headers:");
    console.log(JSON.stringify(pickHeaders(response.headers), null, 2));
    console.log("");

    console.log("response body first 500 chars:");
    console.log(truncate(response.body, 500));
  } catch (error) {
    console.log("error.name:");
    console.log(error && error.name ? error.name : "");
    console.log("");

    console.log("error.message:");
    console.log(error && error.message ? error.message : "");
    console.log("");

    console.log("error.cause:");
    console.log(error && error.cause ? error.cause : null);
    console.log("");

    console.log("error.stack:");
    console.log(error && error.stack ? error.stack : "");
    process.exitCode = 1;
  }
}

main();
