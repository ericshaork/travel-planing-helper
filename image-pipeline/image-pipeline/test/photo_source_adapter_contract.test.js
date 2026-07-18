const test = require("node:test");
const assert = require("node:assert/strict");

const { routePhotoSources } = require("../src/photo_source/photo_source_router");
const { createPhotoSourceAdapter } = require("../src/photo_source/adapters");
const { executeAssetTask } = require("../src/executor/execute_asset_task");
const {
  buildPexelsQueries,
  buildPexelsSearchQuery,
  normalizePexelsPhoto
} = require("../src/photo_source/adapters/pexels_adapter");

test("router can return multiple source candidates in configured priority order", () => {
  const routed = routePhotoSources({
    asset_id: "forbidden_city",
    asset_instance_id: "forbidden_city_explore_cover",
    image_slot: "explore_cover",
    type: "place",
    metadata: {
      photo_source_candidates: [
        {
          source: "wikimedia",
          priority: 1
        },
        {
          source: "mock_gallery",
          priority: 2
        }
      ]
    }
  });

  assert.equal(routed.source_candidates.length, 2);
  assert.equal(routed.source_candidates[0].source, "wikimedia");
  assert.equal(routed.source_candidates[1].source, "mock_gallery");
});

test("router defaults to wikimedia then pexels for real photo sourcing", () => {
  const routed = routePhotoSources({
    asset_id: "forbidden_city",
    asset_instance_id: "forbidden_city_explore_cover",
    image_slot: "explore_cover",
    type: "place"
  });

  assert.equal(routed.source_candidates[0].source, "wikimedia");
  assert.equal(routed.source_candidates[1].source, "pexels");
  assert.equal(routed.source_candidates[1].priority, 2);
});

test("photo source adapter contract exposes search validate rank download methods", async () => {
  const adapter = createPhotoSourceAdapter("mock_gallery");

  assert.equal(typeof adapter.search, "function");
  assert.equal(typeof adapter.validate, "function");
  assert.equal(typeof adapter.rank, "function");
  assert.equal(typeof adapter.download, "function");

  const task = {
    asset_id: "niujie_market",
    asset_instance_id: "niujie_market_food_gallery",
    image_slot: "food_gallery",
    prompt: "Niujie halal market food street",
    metadata: {
      mock_photo_sources: {
        mock_gallery: {
          candidates: [
            {
              title: "Niujie halal market travel street food",
              description: "street food travel market view",
              width: 2800,
              height: 1800,
              mime_type: "image/jpeg",
              url: "https://example.com/niujie-market.jpg",
              license: "CC BY"
            }
          ],
          download_file_path: "mock://downloads/niujie_market.jpg"
        }
      }
    }
  };

  const searched = await adapter.search(task, {});
  assert.equal(searched.candidates.length, 1);

  const validation = adapter.validate(searched.candidates[0], task);
  assert.equal(validation.valid, true);

  const ranked = adapter.rank(searched.candidates, task);
  assert.equal(ranked.length, 1);

  const downloadPath = await adapter.download(ranked[0], task);
  assert.equal(downloadPath, "mock://downloads/niujie_market.jpg");
});

test("pexels adapter builds search queries from preferred task metadata fields", async () => {
  const adapter = createPhotoSourceAdapter("pexels");
  const task = {
    asset_id: "beihai_park",
    asset_instance_id: "beihai_park_explore_cover",
    image_slot: "explore_cover",
    prompt: "Beihai Park Beijing travel cover",
    metadata: {
      location_context: {
        keywords: ["Beijing", "Beihai Park"]
      },
      search_keywords: ["Beihai Park", "White Pagoda"],
      visual_subject: "historic lakeside park",
      asset_name: "Beihai Park",
      mock_photo_sources: {
        pexels: {
          raw_response: {
            photos: [
              {
                id: 12345,
                width: 3000,
                height: 2000,
                url: "https://www.pexels.com/photo/beihai-park/",
                photographer: "Fixture Author",
                alt: "Beihai Park Beijing landscape",
                src: {
                  large: "https://images.pexels.com/photos/12345/beihai-park.jpeg"
                }
              }
            ]
          },
          download_file_path: "mock://downloads/beihai_pexels.jpg"
        }
      }
    }
  };

  const queries = buildPexelsQueries(task, {});
  assert.deepEqual(queries.slice(0, 5), ["Beijing", "Beihai Park", "Beihai Park", "White Pagoda", "historic lakeside park"]);
  assert.equal(buildPexelsSearchQuery(task, {}), "Beijing");

  const searched = await adapter.search(task, {});
  assert.equal(searched.source, "pexels");
  assert.equal(searched.candidates.length, 1);
  assert.equal(searched.candidates[0].candidate_id, "12345");
  assert.equal(searched.candidates[0].image_url, "https://images.pexels.com/photos/12345/beihai-park.jpeg");
  assert.equal(searched.candidates[0].metadata.author, "Fixture Author");

  const ranked = adapter.rank(searched.candidates, task);
  const downloadPath = await adapter.download(ranked[0], task);

  assert.equal(downloadPath, "mock://downloads/beihai_pexels.jpg");
});

test("normalizePexelsPhoto converts raw Pexels photo into shared candidate shape", () => {
  const candidate = normalizePexelsPhoto({
    id: 999,
    width: 2400,
    height: 1600,
    url: "https://www.pexels.com/photo/test/",
    photographer: "Pexels User",
    alt: "Palace Museum architecture",
    src: {
      large2x: "https://images.pexels.com/photos/999/palace-museum.jpeg"
    }
  });

  assert.equal(candidate.source, "pexels");
  assert.equal(candidate.candidate_id, "999");
  assert.equal(candidate.image_url, "https://images.pexels.com/photos/999/palace-museum.jpeg");
  assert.equal(candidate.url, candidate.image_url);
  assert.equal(candidate.title, "Palace Museum architecture");
  assert.equal(candidate.metadata.author, "Pexels User");
  assert.equal(candidate.metadata.license, "Pexels License");
});

test("pexels adapter keeps missing API key behavior unchanged", async () => {
  const adapter = createPhotoSourceAdapter("pexels");
  const result = await adapter.search({
    asset_id: "palace_museum",
    asset_instance_id: "palace_museum_explore_cover",
    image_slot: "explore_cover",
    prompt: "Palace Museum architecture",
    metadata: {}
  }, {
    apiKey: ""
  });

  assert.equal(result.source, "pexels");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.error, "missing_pexels_api_key");
});

test("executor falls back to next photo source when the first source fails", async () => {
  const result = await executeAssetTask({
    task_id: "task_forbidden_city_explore_cover",
    asset_id: "forbidden_city",
    asset_instance_id: "forbidden_city_explore_cover",
    image_slot: "explore_cover",
    type: "place",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Forbidden City Beijing travel architecture",
    metadata: {
      location: "Beijing",
      photo_source_candidates: [
        {
          source: "wikimedia",
          priority: 1
        },
        {
          source: "mock_gallery",
          priority: 2
        }
      ],
      mock_source_failure: "wikimedia",
      mock_photo_sources: {
        mock_gallery: {
          candidates: [
            {
              title: "Forbidden City Beijing architecture landscape",
              description: "travel architecture view of the Forbidden City in Beijing",
              width: 3600,
              height: 2400,
              mime_type: "image/jpeg",
              url: "https://example.com/forbidden-best.jpg",
              license: "CC BY"
            }
          ],
          download_file_path: "mock://downloads/forbidden_city.jpg"
        }
      }
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "mock_gallery");
  assert.equal(result.image_asset.file_path, "mock://downloads/forbidden_city.jpg");
  assert.equal(result.image_asset.metadata.source_runs.length, 2);
  assert.equal(result.image_asset.metadata.source_runs[0].source, "wikimedia");
  assert.equal(result.image_asset.metadata.source_runs[1].source, "mock_gallery");
});

test("executor can fall back from wikimedia to pexels adapter fixture", async () => {
  const result = await executeAssetTask({
    task_id: "task_summer_palace_explore_cover",
    asset_id: "summer_palace",
    asset_instance_id: "summer_palace_explore_cover",
    image_slot: "explore_cover",
    type: "place",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Summer Palace Beijing travel photo",
    metadata: {
      location: "Beijing",
      photo_source_candidates: [
        {
          source: "wikimedia",
          priority: 1
        },
        {
          source: "pexels",
          priority: 2
        }
      ],
      mock_source_failure: "wikimedia",
      location_context: "Beijing",
      search_keywords: ["Summer Palace"],
      visual_subject: "imperial lakeside palace",
      asset_name: "Summer Palace",
      mock_photo_sources: {
        pexels: {
          candidates: [
            {
              title: "Summer Palace Beijing landscape",
              description: "travel architecture lake view",
              width: 3200,
              height: 2100,
              mime_type: "image/jpeg",
              url: "https://example.com/summer-palace-pexels.jpg",
              license: "Pexels License"
            }
          ],
          download_file_path: "mock://downloads/summer_palace_pexels.jpg"
        }
      }
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "pexels");
  assert.equal(result.image_asset.file_path, "mock://downloads/summer_palace_pexels.jpg");
  assert.equal(result.image_asset.metadata.source_runs[0].source, "wikimedia");
  assert.equal(result.image_asset.metadata.source_runs[1].source, "pexels");
});

test("adapter abstraction does not change executor behavior for default single-source routing", async () => {
  const result = await executeAssetTask({
    task_id: "task_beihai_park_explore_cover",
    asset_id: "beihai_park",
    asset_instance_id: "beihai_park_explore_cover",
    image_slot: "explore_cover",
    type: "place",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Beihai Park Beijing travel photo",
    metadata: {
      location: "Beijing",
      photo_candidates: [
        {
          title: "Beihai Park Beijing travel landscape",
          description: "travel landscape architecture view",
          width: 3200,
          height: 2000,
          mime_type: "image/jpeg",
          url: "https://example.com/beihai-park.jpg",
          license: "CC0"
        }
      ],
      mock_download_file_path: "mock://downloads/beihai_park.jpg"
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "wikimedia");
  assert.equal(result.image_asset.file_path, "mock://downloads/beihai_park.jpg");
  assert.deepEqual(
    result.task_state.history.map((entry) => entry.status),
    ["pending", "processing", "completed"]
  );
});
