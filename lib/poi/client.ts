import "server-only";

import { AppError } from "../utils/errors";
import {
  getServerEnvironment,
  type ServerEnvironment,
} from "../utils/env";
import { AmapPoiProvider } from "./amap";
import { MockPoiProvider } from "./mock";
import type { PoiProvider } from "./provider";

export function createPoiProvider(
  environment: ServerEnvironment = getServerEnvironment(),
): PoiProvider {
  if (environment.USE_MOCK_POI || environment.POI_PROVIDER === "mock") {
    return new MockPoiProvider();
  }

  if (!environment.AMAP_API_KEY) {
    throw new AppError(
      "UNKNOWN_ERROR",
      "POI_PROVIDER=amap 时缺少 AMAP_API_KEY，请检查服务端环境变量。",
    );
  }

  return new AmapPoiProvider({
    apiKey: environment.AMAP_API_KEY,
  });
}

export function getPoiProvider(): PoiProvider {
  return createPoiProvider();
}
