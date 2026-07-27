import { readFile } from "node:fs/promises";

import { generateExplorePlan } from "./generatePlan.js";
import { loadCityContext } from "./loadContext.js";
import { parseGenerateRequest } from "./schema.js";

import type { ExplorePlan, GenerateRequest, LlmProvider } from "./types.js";

export async function loadRequestFile(filePath: string): Promise<GenerateRequest> {
  const rawInput = await readFile(filePath, "utf8");
  return parseGenerateRequest(JSON.parse(rawInput));
}

export async function generatePlanFromRequest(options: {
  projectRoot: string;
  request: GenerateRequest;
  provider: LlmProvider;
}): Promise<ExplorePlan> {
  const cityContext = await loadCityContext(options.projectRoot, options.request.city);

  return generateExplorePlan({
    projectRoot: options.projectRoot,
    request: options.request,
    cityContext,
    provider: options.provider,
  });
}
