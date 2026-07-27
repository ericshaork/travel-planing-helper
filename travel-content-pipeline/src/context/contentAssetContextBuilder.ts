import type { CandidateSelectionResult, ImageContextV2 } from "../contentAsset/index.js";

export interface ContentAssetContextItem {
  asset_id: string;
  name: string;
  editorial_roles: string[];
  selection_reason: string[];
  image_context: ImageContextV2;
}

export interface ContentAssetContext {
  selected_assets: ContentAssetContextItem[];
  summary: {
    roles: string[];
    families: string[];
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildContentAssetContext(
  selection: CandidateSelectionResult,
): ContentAssetContext {
  const selectedAssets = selection.selected.map((item) => ({
    asset_id: item.asset.id,
    name: item.asset.name,
    editorial_roles: uniqueStrings([
      ...item.asset.content_role,
      ...item.asset.category,
    ]),
    selection_reason: item.reasons,
    image_context: {
      required: item.image_context.required,
      images: item.image_context.images.map((image) => ({
        type: image.type,
        image_slot: image.image_slot,
        purpose: image.purpose,
        prompt: image.prompt,
        source_preference: image.source_preference,
        generation_mode: image.generation_mode,
        decision_reason: image.decision_reason,
        confidence: image.confidence,
        placeholder: image.placeholder,
        status: image.status,
      })),
    },
  }));

  return {
    selected_assets: selectedAssets,
    summary: {
      roles: [...selection.summary.roles],
      families: Object.keys(selection.summary.families).sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    },
  };
}
