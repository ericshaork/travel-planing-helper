import "server-only";

import type { RouteEstimateRequest, RouteEstimateResult } from "./types";

export interface RouteProvider {
  estimateRoute(request: RouteEstimateRequest): Promise<RouteEstimateResult>;
}

export const ROUTE_WARNINGS = {
  invalidCoordinates: "坐标信息不完整，暂时无法估算路线。",
  transitFallback: "transit 暂未接入真实高德公交规划，已降级为驾车估算。",
  unsupportedModeFallback: "当前路线模式暂不支持，已降级为驾车估算。",
  amapInvalidStatus: "高德路线服务暂时不可用，已回退为安全估算。",
  amapNoRoute: "高德没有返回可用路线，已回退为安全估算。",
  amapInvalidMetrics: "高德路线缺少有效距离或时长，已回退为安全估算。",
} as const;
