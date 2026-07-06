import "server-only";

import type { PoiSearchRequest, PoiSearchResult } from "./types";

export interface PoiProvider {
  searchPoi(request: PoiSearchRequest): Promise<PoiSearchResult>;
}

export const POI_WARNINGS = {
  mockOnly: "v1.3 阶段 1 只支持 Mock POI Provider，真实高德接入放在阶段 2。",
  emptyKeyword: "地点关键词为空，暂时无法查询 POI。",
  emptyCity: "还没有明确城市，暂时无法查询 POI。",
  noMatch: "暂时没找到这个地点，建议换个更具体的名字，或稍后再试真实 POI。",
  invalidRequest: "POI 查询信息还不完整，先跳过地点校验。",
  amapNoResult: "高德 POI 里暂时没找到这个地点。",
  amapInvalidStatus: "高德 POI 服务这次没有返回可用结果，先跳过地点校验。",
  amapInvalidCoordinate: "部分高德 POI 坐标格式异常，已自动跳过。",
} as const;

export function unavailablePoiResult(
  warning: string = POI_WARNINGS.noMatch,
): PoiSearchResult {
  return {
    candidates: [],
    warnings: [warning],
  };
}
