import { NextResponse } from "next/server";

import { createExploreRepository } from "../../../../lib/explore/repository";
import { buildExploreFacets } from "../../../../lib/explore/facets";
import type { ExploreFacetsResponse } from "../../../../lib/explore/types";
import { AppError, toApiErrorResponse } from "../../../../lib/utils/errors";

export function createExploreFacetsHandler(
  repository?: ReturnType<typeof createExploreRepository>,
) {
  return async function GET() {
    try {
      const resolvedRepository = repository ?? createExploreRepository();
      const items = await resolvedRepository.listPublished({ limit: 200 });

      return NextResponse.json({
        ok: true,
        facets: buildExploreFacets(items),
      } satisfies ExploreFacetsResponse);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(toApiErrorResponse(error), {
          status: 500,
        });
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: 500,
      });
    }
  };
}

export const GET = createExploreFacetsHandler();
