import "server-only";

import type { Coordinates } from "../poi/types";
import type { RouteProvider } from "./provider";
import { ROUTE_WARNINGS } from "./provider";
import type {
  RouteEstimateRequest,
  RouteEstimateResult,
  RouteLeg,
  RouteMode,
} from "./types";

const EARTH_RADIUS_METERS = 6_371_000;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function hasValidCoordinateValue(value: number): boolean {
  return Number.isFinite(value);
}

function isValidCoordinates(coordinates: Coordinates): boolean {
  return (
    hasValidCoordinateValue(coordinates.lat) &&
    hasValidCoordinateValue(coordinates.lng) &&
    Math.abs(coordinates.lat) <= 90 &&
    Math.abs(coordinates.lng) <= 180
  );
}

function estimateDistanceMeters(
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

  return Math.round(EARTH_RADIUS_METERS * c);
}

function speedMetersPerMinute(mode: RouteMode): number {
  switch (mode) {
    case "walking":
      return 80;
    case "transit":
      return 280;
    case "other":
      return 220;
    case "driving":
    default:
      return 500;
  }
}

function buildSummary(
  mode: RouteMode,
  distanceMeters: number,
  durationMinutes: number,
): string {
  const distanceKilometers = (
    distanceMeters / 1000
  ).toFixed(distanceMeters >= 1000 ? 1 : 2);

  return `约 ${distanceKilometers} 公里，${mode} 估算 ${durationMinutes} 分钟。`;
}

function invalidRouteResult(mode: RouteMode): RouteEstimateResult {
  return {
    leg: {
      distanceMeters: 0,
      durationMinutes: 0,
      mode,
      provider: "mock",
      summary: "坐标无效，暂时无法估算演示路线。",
    },
    warnings: [ROUTE_WARNINGS.invalidCoordinates],
  };
}

export class MockRouteProvider implements RouteProvider {
  async estimateRoute(
    request: RouteEstimateRequest,
  ): Promise<RouteEstimateResult> {
    const mode = request.mode ?? "driving";

    if (
      !isValidCoordinates(request.origin) ||
      !isValidCoordinates(request.destination)
    ) {
      return invalidRouteResult(mode);
    }

    const distanceMeters = estimateDistanceMeters(
      request.origin,
      request.destination,
    );
    const durationMinutes =
      distanceMeters === 0
        ? 1
        : Math.max(1, Math.ceil(distanceMeters / speedMetersPerMinute(mode)));
    const leg: RouteLeg = {
      distanceMeters,
      durationMinutes,
      mode,
      provider: "mock",
      summary: buildSummary(mode, distanceMeters, durationMinutes),
    };

    return { leg };
  }
}
