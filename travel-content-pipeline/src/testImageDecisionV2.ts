import type { ContentAsset, ImageRequirement } from "./contentAsset/types.js";
import { buildImageContextV2 } from "./contentAsset/imageDecision.js";

function createAsset(overrides: Partial<ContentAsset>): ContentAsset {
  return {
    id: "asset",
    name: "Asset",
    asset_type: "poi",
    category: [],
    content_role: [],
    traveler_fit: {
      couple: "medium",
      student: "medium",
      solo: "medium",
    },
    season_fit: ["spring"],
    best_time: ["morning"],
    experience_value: [],
    avoid_when: [],
    nearby_assets: [],
    map_asset_id: "",
    ...overrides,
  };
}

function findImage(images: ImageRequirement[], slot: string): ImageRequirement {
  const image = images.find((item) => item.image_slot === slot);

  if (!image) {
    throw new Error(`Expected image slot ${slot} to exist.`);
  }

  return image;
}

function assertMode(label: string, image: ImageRequirement, expectedMode: string): void {
  if (image.generation_mode !== expectedMode) {
    throw new Error(`${label}: expected ${expectedMode}, received ${image.generation_mode}`);
  }
}

function main(): void {
  const forbiddenCityCoverAsset = createAsset({
    id: "ca_beijing_forbidden_city",
    name: "Forbidden City",
    category: ["imperial_landmark"],
    content_role: ["signature_anchor", "city_symbolism"],
    experience_value: ["imperial_scale", "first_impression"],
  });
  const forbiddenCityCover = findImage(
    buildImageContextV2(forbiddenCityCoverAsset, "signature_anchor").images,
    "explore_cover",
  );
  assertMode("Forbidden City explore_cover", forbiddenCityCover, "hybrid");

  const forbiddenCityGalleryAsset = createAsset({
    id: "ca_beijing_forbidden_city",
    name: "Forbidden City",
    category: ["imperial_landmark"],
    content_role: ["signature_anchor", "city_symbolism"],
    experience_value: ["imperial_view"],
  });
  const forbiddenCityGallery = findImage(
    buildImageContextV2(forbiddenCityGalleryAsset, "signature_anchor").images,
    "poi_gallery",
  );
  assertMode("Forbidden City poi_gallery", forbiddenCityGallery, "real_photo");

  const liangmaRiverAsset = createAsset({
    id: "ca_beijing_liangma_river",
    name: "Liangma River Night View",
    category: ["modern_contrast", "evening_asset"],
    content_role: ["evening_closure", "modern_city_mood", "slow_walk_anchor"],
    best_time: ["dusk", "evening"],
    experience_value: ["city closure", "waterside walking"],
  });
  const liangmaRiverDayCover = findImage(
    buildImageContextV2(liangmaRiverAsset, "evening_closure").images,
    "day_cover",
  );
  assertMode("Liangma River day_cover", liangmaRiverDayCover, "hybrid");

  const slowWalkContext = buildImageContextV2(liangmaRiverAsset, "slow_walk_anchor");
  const slowWalkImage = findImage(slowWalkContext.images, "poi_gallery");
  assertMode("slow_walk_anchor compatibility", slowWalkImage, "hybrid");

  const foodAsset = createAsset({
    id: "ca_beijing_qianmen_food",
    name: "Qianmen Traditional Food Area",
    category: ["food_backbone", "old_city_food_zone"],
    content_role: ["food_history_connection", "first_visit_food"],
    best_time: ["lunch"],
    experience_value: ["local food"],
  });
  const foodImage = findImage(buildImageContextV2(foodAsset, "food_backbone").images, "food_gallery");
  assertMode("Food asset", foodImage, "real_photo");

  console.log(
    JSON.stringify(
      {
        status: "passed",
        checks: [
          {
            asset: "ca_beijing_forbidden_city",
            image_slot: forbiddenCityCover.image_slot,
            generation_mode: forbiddenCityCover.generation_mode,
          },
          {
            asset: "ca_beijing_forbidden_city",
            image_slot: forbiddenCityGallery.image_slot,
            generation_mode: forbiddenCityGallery.generation_mode,
          },
          {
            asset: "ca_beijing_liangma_river",
            image_slot: liangmaRiverDayCover.image_slot,
            generation_mode: liangmaRiverDayCover.generation_mode,
          },
          {
            asset: "ca_beijing_qianmen_food",
            image_slot: foodImage.image_slot,
            generation_mode: foodImage.generation_mode,
          },
        ],
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Image Decision v2 test failed: ${message}`);
  process.exitCode = 1;
}
