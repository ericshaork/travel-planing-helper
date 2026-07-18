const https = require("https");

const REQUEST_URL = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=Forbidden%20City%20Beijing&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Cmime&iiurlwidth=1600&format=json&origin=*";

function truncate(value, limit = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.length <= limit ? value : value.slice(0, limit);
}

function pickHeaders(headers) {
  const keys = ["content-type", "content-length", "date", "server", "x-cache-status", "cf-cache-status", "cf-ray"];
  const selected = {};

  for (const key of keys) {
    if (headers && headers[key]) {
      selected[key] = headers[key];
    }
  }

  return selected;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "WanderlyImagePipeline/1.0 (wikimedia connection test)",
          Accept: "application/json"
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
      request.destroy(new Error("Wikimedia connection test timed out after 15000ms."));
    });
  });
}

async function main() {
  console.log("request url:");
  console.log(REQUEST_URL);
  console.log("");

  try {
    const response = await requestJson(REQUEST_URL);

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
