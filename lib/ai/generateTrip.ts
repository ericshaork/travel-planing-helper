import "server-only";

import {
  generateTripResponseSchema,
  tripPlanSchema,
} from "../trip/schema";
import type {
  GenerateTripRequest,
  GenerateTripResponse,
} from "../trip/types";
import { AppError } from "../utils/errors";
import type { WeatherForecast } from "../weather/types";
import { extractJsonObject } from "./openai-compatible";
import type { LLMProvider } from "./provider";

export interface GenerateTripWithContextInput extends GenerateTripRequest {
  weatherForecast?: WeatherForecast;
  weatherWarning?: string;
}

function decodeProviderOutput(rawOutput: unknown): unknown {
  if (typeof rawOutput !== "string") {
    return rawOutput;
  }

  try {
    return extractJsonObject(rawOutput);
  } catch {
    return undefined;
  }
}

function validateGenerateTripOutput(
  candidate: unknown,
): GenerateTripResponse | undefined {
  const response = generateTripResponseSchema.safeParse(candidate);

  if (response.success) {
    return response.data;
  }

  const barePlan = tripPlanSchema.safeParse(candidate);

  if (barePlan.success) {
    return generateTripResponseSchema.parse({
      tripPlan: barePlan.data,
    });
  }

  return undefined;
}

function invalidOutputError(): AppError {
  return new AppError(
    "AI_OUTPUT_INVALID",
    "模型刚刚没吐出合格格式，再试一次。",
  );
}

export async function generateTripWithProvider(
  input: GenerateTripWithContextInput,
  provider: LLMProvider,
): Promise<GenerateTripResponse> {
  let rawOutput: unknown;

  try {
    rawOutput =
      input.modificationRequest && input.previousPlan
        ? await provider.regenerateTrip({
            tripRequest: input.tripRequest,
            previousPlan: input.previousPlan,
            modificationRequest: input.modificationRequest,
            weatherForecast: input.weatherForecast,
            weatherWarning: input.weatherWarning,
          })
        : await provider.generateTrip({
            tripRequest: input.tripRequest,
            weatherForecast: input.weatherForecast,
            weatherWarning: input.weatherWarning,
          });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "AI_GENERATION_FAILED",
      "暂时无法生成方案，请稍后重试。",
    );
  }

  const firstResult = validateGenerateTripOutput(
    decodeProviderOutput(rawOutput),
  );

  if (firstResult) {
    return firstResult;
  }

  try {
    const repaired = await provider.repairJson({
      rawOutput,
      targetSchema: generateTripResponseSchema,
      instructions:
        "请修复为完整 GenerateTripResponse。tripPlan 必须包含全部字段，每日行程数量必须与 days 一致。",
    });
    const repairedResult = validateGenerateTripOutput(repaired);

    if (repairedResult) {
      return repairedResult;
    }
  } catch {
    // A repair attempt is allowed once. The unified error is returned below.
  }

  throw invalidOutputError();
}
