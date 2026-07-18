const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const https = require("https");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");

const fixtureDir = path.join(__dirname, "fixtures", "wikimedia");

function createHttpsMock(rawResponse) {
  return (url, options, callback) => {
    const request = new EventEmitter();

    request.setTimeout = (_timeout, _handler) => {};
    request.destroy = (error) => {
      if (error) {
        request.emit("error", error);
      }
    };
    request.on = EventEmitter.prototype.on;

    process.nextTick(() => {
      const response = new PassThrough();

      response.statusCode = 200;
      response.headers = {
        "content-type": "application/json; charset=utf-8"
      };

      callback(response);
      response.end(rawResponse);
    });

    return request;
  };
}

test("buildPhotoQueries creates expected queries for Forbidden City", () => {
  const { buildPhotoQueries } = require("../src/search/photo_query_builder");
  const queries = buildPhotoQueries({
    asset_id: "forbidden_city",
    image_slot: "explore_cover",
    prompt: "Forbidden City Beijing at soft morning light"
  });

  assert.ok(queries.includes("Forbidden City Beijing"));
  assert.ok(queries.includes("故宫 北京"));
});

test("searchWikimediaPhotos parses Forbidden City fixture into candidates", async () => {
  const fixturePath = path.join(fixtureDir, "forbidden_city.search.json");
  const rawResponse = fs.readFileSync(fixturePath, "utf8");
  const originalGet = https.get;

  https.get = createHttpsMock(rawResponse);

  try {
    delete require.cache[require.resolve("../src/adapters/wikimedia_photo_adapter")];
    const { searchWikimediaPhotos } = require("../src/adapters/wikimedia_photo_adapter");
    const results = await searchWikimediaPhotos("Forbidden City Beijing");

    assert.equal(results.length, 1);
    assert.equal(results[0].query, "Forbidden City Beijing");
    assert.equal(results[0].title, "File:Forbidden City Beijing.jpg");
    assert.ok(results[0].url.includes("Forbidden_City_Beijing.jpg"));
    assert.equal(results[0].author, "Daniel Case");
    assert.equal(results[0].license, "CC BY-SA 3.0");
    assert.ok(results[0].source_url.includes("Forbidden_City_Beijing"));
  } finally {
    https.get = originalGet;
    delete require.cache[require.resolve("../src/adapters/wikimedia_photo_adapter")];
  }
});

test("searchWikimediaPhotos parses 798 Art Zone fixture into candidates", async () => {
  const fixturePath = path.join(fixtureDir, "art_zone_798.search.json");
  const rawResponse = fs.readFileSync(fixturePath, "utf8");
  const originalGet = https.get;

  https.get = createHttpsMock(rawResponse);

  try {
    delete require.cache[require.resolve("../src/adapters/wikimedia_photo_adapter")];
    const { searchWikimediaPhotos } = require("../src/adapters/wikimedia_photo_adapter");
    const results = await searchWikimediaPhotos("798 Art Zone Beijing");

    assert.equal(results.length, 1);
    assert.equal(results[0].query, "798 Art Zone Beijing");
    assert.equal(results[0].title, "File:798 Art Zone Beijing.jpg");
    assert.ok(results[0].url.includes("798_Art_Zone_Beijing.jpg"));
    assert.equal(results[0].author, "Example Photographer");
    assert.equal(results[0].license, "CC BY 4.0");
  } finally {
    https.get = originalGet;
    delete require.cache[require.resolve("../src/adapters/wikimedia_photo_adapter")];
  }
});

test("executeAssetTask consumes Wikimedia candidate fixture and generates image_asset", async () => {
  const { executeAssetTask } = require("../src/executor/execute_asset_task");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wikimedia-download-"));

  const result = await executeAssetTask({
    task_id: "task_forbidden_city_explore_cover",
    asset_id: "forbidden_city",
    asset_instance_id: "forbidden_city_explore_cover",
    image_slot: "explore_cover",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Forbidden City Beijing at soft morning light",
    metadata: {
      location: "Beijing",
      photo_candidates: [
        {
          source: "wikimedia",
          candidate_id: "wikimedia_forbidden_city_fixture",
          image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Forbidden_City_Beijing.jpg/1920px-Forbidden_City_Beijing.jpg",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Forbidden_City_Beijing.jpg/1920px-Forbidden_City_Beijing.jpg",
          title: "File:Forbidden City Beijing.jpg",
          description: "Hall of Supreme Harmony at the Forbidden City in Beijing.",
          width: 1600,
          height: 1067,
          mime_type: "image/jpeg",
          author: "Daniel Case",
          license: "CC BY-SA 3.0",
          source_url: "https://commons.wikimedia.org/wiki/File:Forbidden_City_Beijing.jpg"
        }
      ],
      mock_download_file_path: path.join(tempDir, "forbidden_city.jpg")
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "wikimedia");
  assert.ok(result.image_asset.file_path.endsWith("forbidden_city.jpg"));
  assert.deepEqual(result.image_asset.selection.selected_candidate, {
    source: "wikimedia",
    candidate_id: "wikimedia_forbidden_city_fixture",
    image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Forbidden_City_Beijing.jpg/1920px-Forbidden_City_Beijing.jpg"
  });
  assert.deepEqual(
    result.task_state.history.map((entry) => entry.status),
    ["pending", "processing", "completed"]
  );
});

test("executeAssetTask fails for a nonexistent place", async () => {
  const { executeAssetTask } = require("../src/executor/execute_asset_task");

  const result = await executeAssetTask({
    task_id: "task_nonexistent_place",
    asset_id: "totally_nonexistent_place_abcxyz",
    asset_instance_id: "totally_nonexistent_place_abcxyz_place_gallery",
    image_slot: "place_gallery",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Totally nonexistent place abcxyz qwertypoi",
    metadata: {
      mock_source_failure: "wikimedia search timeout",
      photo_source_candidates: [
        {
          source: "wikimedia",
          priority: 1
        }
      ]
    }
  });

  assert.equal(result.image_asset.status, "failed");
  assert.equal(result.image_asset.file_path, "");
  assert.deepEqual(
    result.task_state.history.map((entry) => entry.status),
    ["pending", "processing", "failed"]
  );
});
