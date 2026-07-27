import type {
  ImageManifest,
  ImageRequirementStatus,
} from "./types.js";
import { buildImageManifestTask } from "./imageManifestBuilder.js";

export interface ContentAssetContextLike {
  selected_assets: Array<{
    asset_id: string;
    name: string;
    editorial_roles?: string[];
    image_context: {
      required: boolean;
      images: Array<{
        type: "hero" | "experience" | "detail" | "food";
        image_slot: "explore_cover" | "trip_cover" | "day_cover" | "poi_gallery" | "food_gallery" | "detail_image";
        prompt: string;
        source_preference: "real_first" | "mixed" | "ai_first";
        generation_mode: "real_photo" | "hybrid" | "ai_generated";
        decision_reason: string;
        status: ImageRequirementStatus;
      }>;
    };
  }>;
}

export interface ExportImageManifestOptions {
  trip_id: string;
  city: string;
  content_asset_context: ContentAssetContextLike;
}

export function exportImageManifest(options: ExportImageManifestOptions): ImageManifest {
  const images = options.content_asset_context.selected_assets.flatMap((asset) => {
    if (!asset.image_context.required) {
      return [];
    }

    return asset.image_context.images.map((image) =>
      buildImageManifestTask({
        city: options.city,
        asset_id: asset.asset_id,
        asset_name: asset.name,
        image_slot: image.image_slot,
        type: image.type,
        source_preference: image.source_preference,
        generation_mode: image.generation_mode,
        decision_reason: image.decision_reason,
        prompt: image.prompt,
        status: image.status,
        editorial_roles: asset.editorial_roles,
      }),
    );
  });

  return {
    trip_id: options.trip_id,
    city: options.city,
    images,
  };
}
