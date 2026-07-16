import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getPoiProvider } from "@/lib/poi/client";
import { AppError, toApiErrorResponse } from "@/lib/utils/errors";

const mapSearchRequestSchema = z
  .object({
    city: z.string().trim().min(1).max(80),
    keyword: z.string().trim().min(1).max(120),
    limit: z.number().int().min(1).max(10).optional(),
  })
  .strict();

function errorStatus(error: AppError) {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  let input: z.infer<typeof mapSearchRequestSchema>;

  try {
    const body = (await request.json()) as unknown;
    input = mapSearchRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json(
        toApiErrorResponse(
          new AppError("INVALID_INPUT", "地点搜索信息还不完整，请重新输入。"),
        ),
        { status: 400 },
      );
    }

    return NextResponse.json(toApiErrorResponse(error), { status: 500 });
  }

  try {
    const result = await getPoiProvider().searchPoi(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(toApiErrorResponse(error), {
        status: errorStatus(error),
      });
    }

    return NextResponse.json(toApiErrorResponse(error), { status: 500 });
  }
}
