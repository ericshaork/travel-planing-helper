import "server-only";

import type { Coordinates } from "../poi/types";
import { AppError } from "../utils/errors";
import type { RouteProvider } from "./provider";
import { ROUTE_WARNINGS } from "./provider";
import type {
  RouteEstimateRequest,
  RouteEstimateResult,
  RouteLeg,
  RouteMode,
} from "./types";

const AMAP_DRIVING_ROUTE_URL = "https://restapi.amap.com/v3/direction/driving";
const AMAP_WALKING_ROUTE_URL = "https://restapi.amap.com/v3/direction/walking";
const EARTH_RADIUS_METERS = 6_371_000;

interface AmapRouteProviderOptions {
  apiKey: string;
  drivingUrl?: string;
  walkingUrl?: string;
  fetchImplementation?: typeof fetch;
}

interface AmapRoutePath {
  distance?: string;
  duration?: string;
}

interface AmapRouteResponse {
  status?: string;
  info?: string;
  infocode?: string;
  route?: {
    paths?: AmapRoutePath[];
  };
}

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

function isValidCoordinates(coordinates: Coordinates): boolean {
  return (
    isFiniteCoordinate(coordinates.lat) &&
    isFiniteCoordinate(coordinates.lng) &&
    Math.abs(coordinates.lat) <= 90 &&
    Math.abs(coordinates.lng) <= 180
  );
}

function formatCoordinates(coordinates: Coordinates): string {
  return `${coordinates.lng},${coordinates.lat}`;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function estimateStraightLineDistanceMeters(
  origin: Coordinates,
  destination: Coordinates,
): number {
  const dLat = degreesToRadians(destination.lat - origin.lat);
  const dLng = degreesToRadians(destination.lng - origin.lng);
  const originLat = degreesToRadians(origin.lat);
  const destinationLat = degreesToRadians(destination.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.max(0, Math.round(EARTH_RADIUS_METERS * c));
}

function estimateDurationMinutes(
  distanceMeters: number,
  mode: Extract<RouteMode, "driving" | "walking">,
): number {
  const metersPerMinute = mode === "walking" ? 80 : 500;

  if (distanceMeters <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(distanceMeters / metersPerMinute));
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} 公里`;
  }

  return `${distanceMeters} 米`;
}

function buildSummary(
  mode: Extract<RouteMode, "driving" | "walking">,
  distanceMeters: number,
  durationMinutes: number,
): string {
  const modeLabel = mode === "walking" ? "步行" : "驾车";
  return `${modeLabel}约 ${durationMinutes} 分钟，距离约 ${formatDistance(distanceMeters)}`;
}

function fallbackLeg(
  request: RouteEstimateRequest,
  mode: Extract<RouteMode, "driving" | "walking">,
): RouteLeg {
  const distanceMeters = estimateStraightLineDistanceMeters(
    request.origin,
    request.destination,
  );
  const durationMinutes = estimateDurationMinutes(distanceMeters, mode);

  return {
    distanceMeters,
    durationMinutes,
    mode,
    provider: "amap",
    summary: buildSummary(mode, distanceMeters, durationMinutes),
  };
}

function normalizeMode(mode?: RouteMode): {
  resolvedMode: Extract<RouteMode, "driving" | "walking">;
  warnings: string[];
} {
  const requestedMode = mode ?? "driving";

  if (requestedMode === "walking") {
    return {
      resolvedMode: "walking",
      warnings: [],
    };
  }

  if (requestedMode === "driving") {
    return {
      resolvedMode: "driving",
      warnings: [],
    };
  }

  if (requestedMode === "transit") {
    return {
      resolvedMode: "driving",
      warnings: [ROUTE_WARNINGS.transitFallback],
    };
  }

  return {
    resolvedMode: "driving",
    warnings: [ROUTE_WARNINGS.unsupportedModeFallback],
  };
}

function parseDistanceMeters(distance?: string): number | null {
  if (!distance?.trim()) {
    return null;
  }

  const parsed = Number.parseInt(distance, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseDurationMinutes(duration?: string): number | null {
  if (!duration?.trim()) {
    return null;
  }

  const parsedSeconds = Number.parseInt(duration, 10);
  if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) {
    return null;
  }

  return Math.max(1, Math.ceil(parsedSeconds / 60));
}

export class AmapRouteProvider implements RouteProvider {
  private readonly apiKey: string;
  private readonly drivingUrl: string;
  private readonly walkingUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: AmapRouteProviderOptions) {
    if (!options.apiKey.trim()) {
      throw new AppError(
        "UNKNOWN_ERROR",
        "ROUTE_PROVIDER=amap 时缺少 AMAP_API_KEY，请检查服务端环境变量。",
      );
    }

    this.apiKey = options.apiKey.trim();
    this.drivingUrl = options.drivingUrl ?? AMAP_DRIVING_ROUTE_URL;
    this.walkingUrl = options.walkingUrl ?? AMAP_WALKING_ROUTE_URL;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async estimateRoute(
    request: RouteEstimateRequest,
  ): Promise<RouteEstimateResult> {
    if (
      !isValidCoordinates(request.origin) ||
      !isValidCoordinates(request.destination)
    ) {
      throw new AppError("UNKNOWN_ERROR", ROUTE_WARNINGS.invalidCoordinates);
    }

    const mode = normalizeMode(request.mode);
    const url = new URL(
      mode.resolvedMode === "walking" ? this.walkingUrl : this.drivingUrl,
    );
    url.searchParams.set("origin", formatCoordinates(request.origin));
    url.searchParams.set("destination", formatCoordinates(request.destination));
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("extensions", "base");

    let response: Response;
    try {
      response = await this.fetchImplementation(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      throw new AppError("UNKNOWN_ERROR", "高德路线请求失败了，请稍后再试。");
    }

    let data: AmapRouteResponse;
    try {
      data = (await response.json()) as AmapRouteResponse;
    } catch {
      throw new AppError(
        "UNKNOWN_ERROR",
        "高德路线返回格式异常，请稍后再试。",
      );
    }

    const warnings = [...mode.warnings];

    if (data.status !== "1") {
      return {
        leg: fallbackLeg(request, mode.resolvedMode),
        warnings: [
          ...warnings,
          data.info?.trim() || ROUTE_WARNINGS.amapInvalidStatus,
        ],
      };
    }

    const firstPath = data.route?.paths?.[0];
    if (!firstPath) {
      return {
        leg: fallbackLeg(request, mode.resolvedMode),
        warnings: [...warnings, ROUTE_WARNINGS.amapNoRoute],
      };
    }

    const distanceMeters = parseDistanceMeters(firstPath.distance);
    const durationMinutes = parseDurationMinutes(firstPath.duration);

    if (distanceMeters === null || durationMinutes === null) {
      return {
        leg: fallbackLeg(request, mode.resolvedMode),
        warnings: [...warnings, ROUTE_WARNINGS.amapInvalidMetrics],
      };
    }

    return {
      leg: {
        distanceMeters,
        durationMinutes,
        mode: mode.resolvedMode,
        provider: "amap",
        summary: buildSummary(mode.resolvedMode, distanceMeters, durationMinutes),
      },
      ...(warnings.length === 0 ? {} : { warnings }),
    };
  }
}
