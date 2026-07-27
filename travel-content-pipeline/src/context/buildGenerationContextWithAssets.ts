import {
  loadAssetsWithDiagnostics,
  rankAssets,
  selectCandidates,
  type CandidateSelectionRequest,
} from "../contentAsset/index.js";
import { buildContentAssetContext, type ContentAssetContext } from "./contentAssetContextBuilder.js";
import { buildGenerationContext } from "./buildGenerationContext.js";
import type { GenerationContext, RequestContext } from "./types.js";

export interface GenerationContextWithAssets extends GenerationContext {
  content_asset_context: ContentAssetContext;
}

export async function buildGenerationContextWithAssets(options?: {
  projectRoot?: string;
  request?: Partial<RequestContext>;
  contentAssetRequest?: CandidateSelectionRequest;
}): Promise<GenerationContextWithAssets> {
  const baseContext = await buildGenerationContext({
    projectRoot: options?.projectRoot,
    request: options?.request,
  });

  const contentAssetRequest = resolveContentAssetRequest(
    baseContext.request_context,
    options?.contentAssetRequest,
  );

  const { assets, errors } = await loadAssetsWithDiagnostics(baseContext.request_context.city);
  if (errors.length > 0) {
    throw new Error(`Content asset loading failed:\n${errors.join("\n")}`);
  }

  const rankedAssets = rankAssets(contentAssetRequest, assets);
  const selection = selectCandidates(contentAssetRequest, rankedAssets);
  const contentAssetContext = buildContentAssetContext(selection);

  return {
    ...baseContext,
    content_asset_context: contentAssetContext,
  };
}

function resolveContentAssetRequest(
  requestContext: RequestContext,
  override?: CandidateSelectionRequest,
): CandidateSelectionRequest {
  if (override) {
    return override;
  }

  return {
    traveler: requestContext.traveler_type,
    season: requestContext.season,
    purpose: inferPurpose(requestContext),
    days: requestContext.days,
  };
}

function inferPurpose(requestContext: RequestContext): string {
  const haystack = `${requestContext.motivation} ${requestContext.theme}`.toLowerCase();

  if (haystack.includes("美食") || haystack.includes("food")) {
    return "food_exploration";
  }

  if (haystack.includes("深度") || haystack.includes("solo") || haystack.includes("一人")) {
    return "deep_exploration";
  }

  return "first_visit";
}
