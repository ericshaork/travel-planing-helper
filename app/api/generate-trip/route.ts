import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { planTrip } from "../../../lib/trip/planner";
import { generateTripRequestSchema } from "../../../lib/trip/schema";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

type TripPlanner = typeof planTrip;

function errorStatus(error: AppError): number {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  if (
    error.code === "AI_GENERATION_FAILED" ||
    error.code === "AI_OUTPUT_INVALID" ||
    error.code === "WEATHER_API_FAILED"
  ) {
    return 502;
  }

  return 500;
}

export function createGenerateTripHandler(planner: TripPlanner = planTrip) {
  return async function POST(request: Request) {
    let input: unknown;

    try {
      const body = (await request.json()) as unknown;
      input = generateTripRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        const invalidInputError = new AppError(
          "INVALID_INPUT",
          "旅行信息还没填完整，检查一下再试。",
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
      const result = await planner(input);
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

export const POST = createGenerateTripHandler();
