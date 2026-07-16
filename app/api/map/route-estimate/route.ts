import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRouteProvider } from "@/lib/route/client";
import { AppError, toApiErrorResponse } from "@/lib/utils/errors";

const coordinatesSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

const routeEstimateRequestSchema = z
  .object({
    origin: coordinatesSchema,
    destination: coordinatesSchema,
    mode: z.enum(["driving", "walking", "transit", "other"]).optional(),
  })
  .strict();

function errorStatus(error: AppError) {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  let input: z.infer<typeof routeEstimateRequestSchema>;

  try {
    const body = (await request.json()) as unknown;
    input = routeEstimateRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json(
        toApiErrorResponse(
          new AppError("INVALID_INPUT", "两点距离查询信息还不完整，请重新选择地点。"),
        ),
        { status: 400 },
      );
    }

    return NextResponse.json(toApiErrorResponse(error), { status: 500 });
  }

  try {
    const result = await getRouteProvider().estimateRoute(input);
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
