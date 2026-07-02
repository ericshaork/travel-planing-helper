import "server-only";

import { getLLMProvider } from "./client";
import type { LLMProvider } from "./provider";
import {
  parseTripRequestSchema,
  parseTripResponseSchema,
} from "../trip/schema";
import type { ParseTripResponse } from "../trip/types";
import { AppError } from "../utils/errors";

export async function parseTrip(
  input: unknown,
  provider: LLMProvider = getLLMProvider(),
): Promise<ParseTripResponse> {
  const parsedInput = parseTripRequestSchema.parse(input);
  const providerResult = await provider.parseTrip(parsedInput);
  const parsedResult = parseTripResponseSchema.safeParse(providerResult);

  if (!parsedResult.success) {
    throw new AppError(
      "AI_OUTPUT_INVALID",
      "解析结果格式不对，再试一次。",
    );
  }

  return parsedResult.data;
}
