import "server-only";

import { AppError } from "../utils/errors";
import {
  getServerEnvironment,
  type ServerEnvironment,
} from "../utils/env";
import { AmapRouteProvider } from "./amap";
import { MockRouteProvider } from "./mock";
import type { RouteProvider } from "./provider";

export function createRouteProvider(
  environment: ServerEnvironment = getServerEnvironment(),
): RouteProvider {
  if (environment.USE_MOCK_ROUTE || environment.ROUTE_PROVIDER === "mock") {
    return new MockRouteProvider();
  }

  if (!environment.AMAP_API_KEY) {
    throw new AppError(
      "UNKNOWN_ERROR",
      "ROUTE_PROVIDER=amap 时缺少 AMAP_API_KEY，请检查服务端环境变量。",
    );
  }

  return new AmapRouteProvider({
    apiKey: environment.AMAP_API_KEY,
  });
}

export function getRouteProvider(): RouteProvider {
  return createRouteProvider();
}
