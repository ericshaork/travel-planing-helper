import { NextResponse } from "next/server";

import { createExploreRepository } from "../../../../lib/explore/repository";
import { buildExploreFacets } from "../../../../lib/explore/facets";
import { EXPLORE_MOCK_ARCHIVES } from "../../../../lib/explore/mock-archives";
import {
  getNormalizedExploreArchives,
  mapNormalizedArchiveToExploreContent,
} from "../../../../lib/explore/normalized-source";
import type { ExploreFacetsResponse } from "../../../../lib/explore/types";
import { AppError, toApiErrorResponse } from "../../../../lib/utils/errors";

export function createExploreFacetsHandler(
  repository?: ReturnType<typeof createExploreRepository>,
) {
  return async function GET() {
    try {
      const normalizedItems = getNormalizedExploreArchives({ limit: 200 }).map((item) =>
        mapNormalizedArchiveToExploreContent(item),
      );

      if (normalizedItems.length > 0) {
        return NextResponse.json({
          ok: true,
          facets: buildExploreFacets(normalizedItems),
        } satisfies ExploreFacetsResponse);
      }

      const resolvedRepository = repository ?? createExploreRepository();
      const items = await resolvedRepository.listPublished({ limit: 200 });

      if (items.length > 0) {
        return NextResponse.json({
          ok: true,
          facets: buildExploreFacets(items),
        } satisfies ExploreFacetsResponse);
      }

      return NextResponse.json({
        ok: true,
        facets: buildExploreFacets(EXPLORE_MOCK_ARCHIVES),
      } satisfies ExploreFacetsResponse);
    } catch (error) {
      const fallbackItems = EXPLORE_MOCK_ARCHIVES;

      if (fallbackItems.length > 0) {
        return NextResponse.json({
          ok: true,
          facets: buildExploreFacets(fallbackItems),
        } satisfies ExploreFacetsResponse);
      }

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
