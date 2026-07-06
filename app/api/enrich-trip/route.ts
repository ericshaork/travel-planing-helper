import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { buildTripResultEnrichment } from "../../../lib/trip/result-enrichment";
import { tripPlanSchema, tripRequestSchema } from "../../../lib/trip/schema";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

const enrichTripRequestSchema = z
  .object({
    tripPlan: tripPlanSchema,
    tripRequest: tripRequestSchema.optional().nullable(),
  })
  .strict();

type EnrichTripRequest = z.infer<typeof enrichTripRequestSchema>;
type BuildTripResultEnrichment = typeof buildTripResultEnrichment;

function errorStatus(error: AppError): number {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  if (error.code === "WEATHER_API_FAILED") {
    return 502;
  }

  return 500;
}

export function createEnrichTripHandler(
  enricher: BuildTripResultEnrichment = buildTripResultEnrichment,
) {
  return async function POST(request: Request) {
    let input: EnrichTripRequest;

    try {
      const body = (await request.json()) as unknown;
      input = enrichTripRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        const invalidInputError = new AppError(
          "INVALID_INPUT",
          "行程信息还不完整，暂时没法生成路线洞察。",
        );

        return NextResponse.json(toApiErrorResponse(invalidInputError), {
          status: 400,
        });
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: 500,
      });
    }

    try {
      const result = await enricher(input);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(toApiErrorResponse(error), {
          status: errorStatus(error),
        });
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: 500,
      });
    }
  };
}

export const POST = createEnrichTripHandler();
