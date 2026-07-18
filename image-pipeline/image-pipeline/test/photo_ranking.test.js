const test = require("node:test");
const assert = require("node:assert/strict");

const { validateImageCandidate } = require("../src/validation/image_validator");
const { rankPhotos } = require("../src/ranking/photo_ranker");
const { executeAssetTask } = require("../src/executor/execute_asset_task");
const { routePhotoSources } = require("../src/photo_source/photo_source_router");

test("Case 1: Forbidden City prefers location-matched highest resolution photo", async () => {
  const candidates = [
    {
      title: "Forbidden City Beijing architecture landscape",
      description: "travel architecture view of the Forbidden City in Beijing",
      width: 3600,
      height: 2400,
      mime_type: "image/jpeg",
      url: "https://example.com/forbidden-best.jpg",
      license: "CC BY"
    },
    {
      title: "Palace Museum Beijing architecture",
      description: "travel architecture photo",
      width: 2400,
      height: 1600,
      mime_type: "image/jpeg",
      url: "https://example.com/forbidden-mid.jpg",
      license: "CC0"
    },
    {
      title: "Forbidden City crowd at night",
      description: "travel crowd night photo in Beijing",
      width: 4000,
      height: 2600,
      mime_type: "image/jpeg",
      url: "https://example.com/forbidden-penalty.jpg",
      license: "CC0"
    }
  ];

  const ranked = rankPhotos(candidates, {
    asset_id: "forbidden_city",
    prompt: "Forbidden City Beijing travel architecture",
    location: "Beijing",
    asset_role: "place"
  });

  assert.equal(ranked[0].url, "https://example.com/forbidden-best.jpg");

  const routed = routePhotoSources({
    asset_id: "forbidden_city",
    image_slot: "place_gallery",
    type: "place"
  });
  assert.equal(routed.source_candidates[0].source, "wikimedia");
  assert.equal(routed.source_candidates[0].priority, 1);

  const result = await executeAssetTask({
    task_id: "task_forbidden_city",
    asset_id: "forbidden_city",
    image_slot: "explore_cover",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Forbidden City Beijing travel architecture",
    metadata: {
      photo_candidates: candidates,
      mock_download_file_path: "mock://downloads/forbidden_city.jpg",
      location: "Beijing"
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "wikimedia");
  assert.equal(result.image_asset.file_path, "mock://downloads/forbidden_city.jpg");
  assert.equal(result.image_asset.selection.candidate_count, 3);
  assert.ok(result.image_asset.selection.rank_score > 0);
});

test("Case 2: all low quality photos should fail validation and return failed", async () => {
  const result = await executeAssetTask({
    task_id: "task_low_quality_only",
    asset_id: "small_place",
    image_slot: "place_gallery",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Small place travel photo",
    metadata: {
      photo_candidates: [
        {
          title: "Small place photo",
          description: "travel view",
          width: 800,
          height: 600,
          mime_type: "image/jpeg",
          url: "https://example.com/small-1.jpg",
          license: "CC BY"
        },
        {
          title: "Another small place photo",
          description: "architecture view",
          width: 1000,
          height: 700,
          mime_type: "image/png",
          url: "https://example.com/small-2.png",
          license: "CC0"
        }
      ],
      mock_download_file_path: "mock://downloads/small_place.jpg",
      location: "Unknown"
    }
  });

  assert.equal(result.image_asset.status, "failed");
  assert.equal(result.image_asset.reason, "no_valid_photo_candidate");
  assert.equal(result.image_asset.selection.candidate_count, 2);
  assert.equal(result.image_asset.selection.rejected_count, 2);
});

test("Case 3: logo, map, and icon images should be filtered by validator", () => {
  const mapValidation = validateImageCandidate({
    title: "Beijing map",
    description: "city map diagram",
    width: 2400,
    height: 1800,
    mime_type: "image/jpeg",
    url: "https://example.com/map.jpg",
    license: "CC BY"
  });
  const iconValidation = validateImageCandidate({
    title: "Forbidden City icon",
    description: "tourism icon",
    width: 2000,
    height: 1200,
    mime_type: "image/png",
    url: "https://example.com/icon.png",
    license: "CC0"
  });
  const svgValidation = validateImageCandidate({
    title: "White Pagoda logo",
    description: "vector logo",
    width: 3000,
    height: 2000,
    mime_type: "image/svg+xml",
    url: "https://example.com/logo.svg",
    license: "CC BY"
  });

  assert.equal(mapValidation.valid, false);
  assert.equal(iconValidation.valid, false);
  assert.equal(svgValidation.valid, false);
  assert.ok(mapValidation.reasons.some((reason) => reason.startsWith("rejected_keyword")));
  assert.ok(svgValidation.reasons.includes("unsupported_format"));
});

test("Case 4: CC0 photo should rank higher than ordinary CC BY when other factors are equal", () => {
  const ranked = rankPhotos(
    [
      {
        title: "798 Art Zone Beijing architecture travel",
        description: "architecture street travel view",
        width: 2400,
        height: 1600,
        mime_type: "image/jpeg",
        url: "https://example.com/798-ccby.jpg",
        license: "CC BY"
      },
      {
        title: "798 Art Zone Beijing architecture travel",
        description: "architecture street travel view",
        width: 2400,
        height: 1600,
        mime_type: "image/jpeg",
        url: "https://example.com/798-cc0.jpg",
        license: "CC0"
      }
    ],
    {
      asset_id: "art_zone_798",
      prompt: "798 Art Zone Beijing street architecture travel",
      location: "Beijing",
      asset_role: "place"
    }
  );

  assert.equal(ranked[0].url, "https://example.com/798-cc0.jpg");
  assert.ok(ranked[0].score > ranked[1].score);
});

test("Case 5: Niujie food/place task should route through real_photo source router and complete from Wikimedia candidates", async () => {
  const routed = routePhotoSources({
    asset_id: "niujie_halal_market",
    image_slot: "food_gallery",
    type: "food"
  });

  assert.equal(routed.source_candidates[0].source, "wikimedia");
  assert.equal(routed.source_candidates[0].selection_hint, "food_or_place_reference_photo");

  const result = await executeAssetTask({
    task_id: "task_niujie_food",
    asset_id: "niujie_halal_market",
    image_slot: "food_gallery",
    type: "food",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Niujie Beijing halal market food street travel photo",
    metadata: {
      photo_candidates: [
        {
          title: "Niujie Beijing halal food street",
          description: "street food travel market view",
          width: 2800,
          height: 1800,
          mime_type: "image/jpeg",
          url: "https://example.com/niujie-food.jpg",
          license: "CC BY"
        }
      ],
      mock_download_file_path: "mock://downloads/niujie_food.jpg",
      location: "Beijing"
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "wikimedia");
  assert.equal(result.image_asset.selection.candidate_count, 1);
  assert.equal(result.image_asset.fallback_available, false);
});

test("Case 6: wikimedia and pexels source search failures should return fallback_available without crashing", async () => {
  const result = await executeAssetTask({
    task_id: "task_missing_source",
    asset_id: "unknown_place",
    image_slot: "place_gallery",
    type: "place",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Unknown place travel photo",
    metadata: {
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
      mock_source_failure: "wikimedia search timeout",
      location: "Unknown",
      mock_photo_sources: {
        pexels: {
          error: "pexels search timeout"
        }
      }
    }
  });

  assert.equal(result.image_asset.status, "failed");
  assert.equal(result.image_asset.reason, "no_photo_search_result");
  assert.equal(result.image_asset.fallback_available, true);
  assert.equal(result.image_asset.metadata.source_runs[0].source, "wikimedia");
  assert.equal(result.image_asset.metadata.source_runs[0].error, "wikimedia search timeout");
  assert.equal(result.image_asset.metadata.source_runs[1].source, "pexels");
  assert.equal(result.image_asset.metadata.source_runs[1].error, "pexels search timeout");
});

test("Case 7: wikimedia failure should fall back to mocked pexels candidate and complete", async () => {
  const result = await executeAssetTask({
    task_id: "task_fallback_to_pexels",
    asset_id: "unknown_place_with_fallback",
    asset_instance_id: "unknown_place_with_fallback_place_gallery",
    image_slot: "place_gallery",
    type: "place",
    mode: "real_photo",
    generation_mode: "real_photo",
    prompt: "Unknown place travel photo with fallback",
    metadata: {
      location: "Unknown",
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
      mock_source_failure: "wikimedia search timeout",
      mock_photo_sources: {
        pexels: {
          candidates: [
            {
              title: "Quiet travel street landscape",
              description: "travel street landscape view",
              width: 3200,
              height: 2000,
              mime_type: "image/jpeg",
              url: "https://example.com/unknown-place-pexels.jpg",
              license: "Pexels License"
            }
          ],
          download_file_path: "mock://downloads/unknown_place_pexels.jpg"
        }
      }
    }
  });

  assert.equal(result.image_asset.status, "completed");
  assert.equal(result.image_asset.source, "pexels");
  assert.equal(result.image_asset.file_path, "mock://downloads/unknown_place_pexels.jpg");
  assert.equal(result.image_asset.fallback_available, false);
  assert.equal(result.image_asset.metadata.source_runs[0].source, "wikimedia");
  assert.equal(result.image_asset.metadata.source_runs[0].error, "wikimedia search timeout");
  assert.equal(result.image_asset.metadata.source_runs[1].source, "pexels");
  assert.equal(result.image_asset.metadata.source_runs[1].error, null);
});
