import { selectContext, toSelectContextRequest } from "./selectContext.js";
import { resolveMapContext } from "./mapContextResolver.js";
import type { GenerationContext, RequestContext } from "./types.js";

export async function buildGenerationContext(options?: {
  projectRoot?: string;
  request?: Partial<RequestContext>;
}): Promise<GenerationContext> {
  const requestContext: RequestContext = {
    city: "beijing",
    traveler_type: "couple",
    days: 3,
    season: "autumn",
    budget: "medium",
    pace: "balanced",
    motivation: "首次到访",
    theme: "首次北京印象 / 情侣氛围路线",
    ...options?.request,
  };

  const selected = selectContext(toSelectContextRequest(requestContext));
  const resolvedMapContext = await resolveMapContext({
    projectRoot: options?.projectRoot,
    requestContext,
    contentContext: selected.selected_content_context,
    selectedMapContext: selected.selected_map_context,
  });

  return {
    request_context: requestContext,
    content_context: selected.selected_content_context,
    city_strategy_context: selected.selected_city_strategy_context,
    generation_guidance: selected.selected_generation_guidance,
    map_context: resolvedMapContext,
    quality_context: selected.selected_quality_context,
  };
}
