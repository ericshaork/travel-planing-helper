import { NextResponse } from "next/server";

import {
  getNormalizedExploreArchiveByExternalId,
  getNormalizedExploreArchiveBySlug,
  mapNormalizedArchiveToExploreContent,
} from "../../../../lib/explore/normalized-source";
import { createExploreRepository } from "../../../../lib/explore/repository";
import { getMockExploreDetail } from "../../../../lib/explore/mock-archives";
import type { ExploreDetailResponse } from "../../../../lib/explore/types";
import { AppError, toApiErrorResponse } from "../../../../lib/utils/errors";

function normalizeExploreId(id: string) {
  return id.trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function createExploreDetailHandler(
  repository?: ReturnType<typeof createExploreRepository>,
) {
  return async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
  ) {
    try {
      const { id } = await context.params;
      const normalizedId = normalizeExploreId(id);

      if (!normalizedId) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "Explore 内容 id 不能为空。",
            },
          },
          { status: 400 },
        );
      }

      const normalizedItem =
        getNormalizedExploreArchiveBySlug(normalizedId) ??
        getNormalizedExploreArchiveByExternalId(normalizedId);

      if (normalizedItem) {
        return NextResponse.json({
          ok: true,
          item: mapNormalizedArchiveToExploreContent(normalizedItem),
        } satisfies ExploreDetailResponse);
      }

      const resolvedRepository = repository ?? createExploreRepository();
      const item = isUuid(normalizedId)
        ? (await resolvedRepository.getById(normalizedId)) ??
          (await resolvedRepository.getBySlug(normalizedId)) ??
          (await resolvedRepository.getByExternalId(normalizedId))
        : (await resolvedRepository.getBySlug(normalizedId)) ??
          (await resolvedRepository.getByExternalId(normalizedId));

      if (!item) {
        const mockItem = getMockExploreDetail(normalizedId);

        if (mockItem) {
          return NextResponse.json({
            ok: true,
            item: mockItem,
          } satisfies ExploreDetailResponse);
        }
      }

      if (!item) {
        return NextResponse.json(
          {
            error: {
              code: "UNKNOWN_ERROR",
              message: "这条 Explore 内容暂时不存在。",
            },
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        item,
      } satisfies ExploreDetailResponse);
    } catch (error) {
      const { id } = await context.params;
      const mockItem = getMockExploreDetail(normalizeExploreId(id));

      if (mockItem) {
        return NextResponse.json({
          ok: true,
          item: mockItem,
        } satisfies ExploreDetailResponse);
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

export const GET = createExploreDetailHandler();
