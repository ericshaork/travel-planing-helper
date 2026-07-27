import { DeepSeekProvider } from "./deepseek.js";

import type { LlmProvider } from "../types.js";

export function createLlmProvider(): LlmProvider {
  const providerName = (process.env.LLM_PROVIDER ?? "deepseek").trim().toLowerCase();

  switch (providerName) {
    case "deepseek":
      return new DeepSeekProvider();
    default:
      throw new Error(`Unsupported LLM provider "${providerName}".`);
  }
}
