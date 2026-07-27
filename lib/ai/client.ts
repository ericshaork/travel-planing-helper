import "server-only";

import {
  getServerEnvironment,
  resolveAiRuntimeConfig,
  type ServerEnvironment,
} from "../utils/env";
import { MockLLMProvider } from "./mock";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { LLMProvider } from "./provider";

export function createLLMProvider(
  environment: ServerEnvironment = getServerEnvironment(),
): LLMProvider {
  const config = resolveAiRuntimeConfig(environment);

  if (config.providerName === "mock") {
    return new MockLLMProvider();
  }

  return new OpenAICompatibleProvider({
    baseUrl: config.baseUrl!,
    apiKey: config.apiKey!,
    model: config.model!,
    timeoutMs: config.timeoutMs,
  });
}

export function getLLMProvider(): LLMProvider {
  return createLLMProvider();
}
