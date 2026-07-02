import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { parseTrip } from "../../../lib/ai/parseTrip";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

function errorStatus(error: AppError): number {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  if (
    error.code === "AI_GENERATION_FAILED" ||
    error.code === "AI_OUTPUT_INVALID"
  ) {
    return 502;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const result = await parseTrip(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      const invalidInputError = new AppError(
        "INVALID_INPUT",
        "这段旅行需求还没法解析，检查一下内容和长度再试试。",
      );

      return NextResponse.json(toApiErrorResponse(invalidInputError), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      return NextResponse.json(toApiErrorResponse(error), {
        status: errorStatus(error),
      });
    }

    return NextResponse.json(toApiErrorResponse(error), {
      status: 500,
    });
  }
}
