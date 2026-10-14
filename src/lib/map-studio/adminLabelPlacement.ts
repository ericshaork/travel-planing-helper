import type { AmapCoordinateDisplayMode } from "../map/coordinateTransform";

export interface AdminLabelPoint {
  lng: number;
  lat: number;
}

export interface AdminLabelBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type AdminLabelPlacementStrategy =
  | "override"
  | "existing_label_point"
  | "largest_polygon"
  | "viewport_intersection"
  | "bbox_center"
  | "center_fallback";

export interface AdminLabelPlacementFeature {
  adcode?: string | null;
  name?: string | null;
  level?: string | null;
  center?: AdminLabelPoint | null;
  labelPosition?: AdminLabelPoint | null;
  bbox?: AdminLabelBounds | null;
  boundaries: AdminLabelPoint[][];
  metadata?: {
    labelPointOverride?: AdminLabelPoint | null;
  } | null;
}

export interface AdminLabelPlacementResult {
  point: AdminLabelPoint | null;
  strategy: AdminLabelPlacementStrategy;
  diagnostics: {
    originalLabelPoint: AdminLabelPoint | null;
    finalLabelPoint: AdminLabelPoint | null;
    inViewport: boolean | null;
    inPolygon: boolean | null;
    isMultiPolygon: boolean;
  };
}

const LABEL_PLACEMENT_CACHE_LIMIT = 3000;
const adminLabelPlacementCache = new Map<string, AdminLabelPlacementResult>();

export function clearAdminLabelPlacementCache() {
  adminLabelPlacementCache.clear();
}

export function getAdminLabelPlacementCacheKey(input: {
  adcode?: string | null;
  level?: string | null;
  viewportTileKey?: string | null;
  displayMode: AmapCoordinateDisplayMode;
}) {
  return [
    "admin-label",
    input.adcode ?? "unknown",
    input.level ?? "unknown",
    input.viewportTileKey ?? "global",
    input.displayMode,
  ].join(":");
}

function rememberLabelPlacement(cacheKey: string, result: AdminLabelPlacementResult) {
  if (adminLabelPlacementCache.has(cacheKey)) {
    adminLabelPlacementCache.delete(cacheKey);
  }

  adminLabelPlacementCache.set(cacheKey, result);

  while (adminLabelPlacementCache.size > LABEL_PLACEMENT_CACHE_LIMIT) {
    const oldestKey = adminLabelPlacementCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    adminLabelPlacementCache.delete(oldestKey);
  }
}

function isValidPoint(point: AdminLabelPoint | null | undefined): point is AdminLabelPoint {
  return Boolean(
    point &&
      Number.isFinite(point.lng) &&
      Number.isFinite(point.lat),
  );
}

function normalizeBounds(bounds: AdminLabelBounds): AdminLabelBounds {
  return {
    minLng: Math.min(bounds.minLng, bounds.maxLng),
    maxLng: Math.max(bounds.minLng, bounds.maxLng),
    minLat: Math.min(bounds.minLat, bounds.maxLat),
    maxLat: Math.max(bounds.minLat, bounds.maxLat),
  };
}

export function isPointInAdminLabelBounds(
  point: AdminLabelPoint,
  bounds: AdminLabelBounds,
) {
  const normalized = normalizeBounds(bounds);
  return (
    point.lng >= normalized.minLng &&
    point.lng <= normalized.maxLng &&
    point.lat >= normalized.minLat &&
    point.lat <= normalized.maxLat
  );
}

function getBoundsCenter(bounds: AdminLabelBounds): AdminLabelPoint {
  const normalized = normalizeBounds(bounds);
  return {
    lng: (normalized.minLng + normalized.maxLng) / 2,
    lat: (normalized.minLat + normalized.maxLat) / 2,
  };
}

function getBoundsIntersection(
  left: AdminLabelBounds | null | undefined,
  right: AdminLabelBounds | null | undefined,
): AdminLabelBounds | null {
  if (!left || !right) return null;
  const a = normalizeBounds(left);
  const b = normalizeBounds(right);
  const minLng = Math.max(a.minLng, b.minLng);
  const maxLng = Math.min(a.maxLng, b.maxLng);
  const minLat = Math.max(a.minLat, b.minLat);
  const maxLat = Math.min(a.maxLat, b.maxLat);

  if (minLng > maxLng || minLat > maxLat) {
    return null;
  }

  return { minLng, minLat, maxLng, maxLat };
}

function getBoundsArea(bounds: AdminLabelBounds | null | undefined) {
  if (!bounds) return 0;
  const normalized = normalizeBounds(bounds);
  return Math.max(0, normalized.maxLng - normalized.minLng) *
    Math.max(0, normalized.maxLat - normalized.minLat);
}

export function getAdminRingBounds(ring: AdminLabelPoint[]): AdminLabelBounds | null {
  const first = ring.find(isValidPoint);
  if (!first) return null;

  return normalizeBounds(
    ring.reduce<AdminLabelBounds>(
      (bounds, point) => ({
        minLng: Math.min(bounds.minLng, point.lng),
        minLat: Math.min(bounds.minLat, point.lat),
        maxLng: Math.max(bounds.maxLng, point.lng),
        maxLat: Math.max(bounds.maxLat, point.lat),
      }),
      {
        minLng: first.lng,
        minLat: first.lat,
        maxLng: first.lng,
        maxLat: first.lat,
      },
    ),
  );
}

export function getAdminRingSignedArea(ring: AdminLabelPoint[]) {
  if (ring.length < 3) return 0;
  let area = 0;
  const lastIndex = ring.length - 1;
  const isClosed =
    ring[0]!.lng === ring[lastIndex]!.lng &&
    ring[0]!.lat === ring[lastIndex]!.lat;
  const count = isClosed ? lastIndex : ring.length;

  for (let index = 0; index < count; index += 1) {
    const current = ring[index]!;
    const next = ring[(index + 1) % count]!;
    area += current.lng * next.lat - next.lng * current.lat;
  }

  return area / 2;
}

export function pointInPolygon(point: AdminLabelPoint, ring: AdminLabelPoint[]) {
  if (!isValidPoint(point) || ring.length < 3) return false;

  let inside = false;
  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index, index += 1) {
    const current = ring[index]!;
    const previous = ring[previousIndex]!;
    const intersects =
      current.lat > point.lat !== previous.lat > point.lat &&
      point.lng <
        ((previous.lng - current.lng) * (point.lat - current.lat)) /
          (previous.lat - current.lat || Number.EPSILON) +
          current.lng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getPolygonCentroid(ring: AdminLabelPoint[]): AdminLabelPoint | null {
  const signedArea = getAdminRingSignedArea(ring);
  if (Math.abs(signedArea) < Number.EPSILON) return null;

  let lngSum = 0;
  let latSum = 0;
  const lastIndex = ring.length - 1;
  const isClosed =
    ring[0]!.lng === ring[lastIndex]!.lng &&
    ring[0]!.lat === ring[lastIndex]!.lat;
  const count = isClosed ? lastIndex : ring.length;

  for (let index = 0; index < count; index += 1) {
    const current = ring[index]!;
    const next = ring[(index + 1) % count]!;
    const cross = current.lng * next.lat - next.lng * current.lat;
    lngSum += (current.lng + next.lng) * cross;
    latSum += (current.lat + next.lat) * cross;
  }

  const point = {
    lng: lngSum / (6 * signedArea),
    lat: latSum / (6 * signedArea),
  };

  return isValidPoint(point) ? point : null;
}

export function pickLargestPolygon(rings: AdminLabelPoint[][]) {
  return rings
    .filter((ring) => ring.length >= 3)
    .sort((left, right) => {
      const areaDelta = Math.abs(getAdminRingSignedArea(right)) - Math.abs(getAdminRingSignedArea(left));
      if (areaDelta !== 0) return areaDelta;
      return getBoundsArea(getAdminRingBounds(right)) - getBoundsArea(getAdminRingBounds(left));
    })[0] ?? null;
}

function pickLargestVisiblePolygon(
  rings: AdminLabelPoint[][],
  viewport: AdminLabelBounds,
) {
  return rings
    .map((ring) => {
      const bounds = getAdminRingBounds(ring);
      return {
        ring,
        bounds,
        intersection: getBoundsIntersection(bounds, viewport),
      };
    })
    .filter((entry) => entry.intersection)
    .sort((left, right) => {
      const overlapDelta = getBoundsArea(right.intersection) - getBoundsArea(left.intersection);
      if (overlapDelta !== 0) return overlapDelta;
      return Math.abs(getAdminRingSignedArea(right.ring)) - Math.abs(getAdminRingSignedArea(left.ring));
    })[0] ?? null;
}

function getNearestRingPointInBounds(
  target: AdminLabelPoint,
  ring: AdminLabelPoint[],
  bounds: AdminLabelBounds,
) {
  const candidates = ring.filter((point) => isPointInAdminLabelBounds(point, bounds));
  if (candidates.length === 0) return null;

  return candidates.sort((left, right) => {
    const leftDistance = (left.lng - target.lng) ** 2 + (left.lat - target.lat) ** 2;
    const rightDistance = (right.lng - target.lng) ** 2 + (right.lat - target.lat) ** 2;
    return leftDistance - rightDistance;
  })[0] ?? null;
}

function findRepresentativePointInRing(
  ring: AdminLabelPoint[],
  preferredBounds?: AdminLabelBounds | null,
) {
  const ringBounds = getAdminRingBounds(ring);
  const activeBounds = preferredBounds ?? ringBounds;
  const center = activeBounds ? getBoundsCenter(activeBounds) : null;

  if (center && pointInPolygon(center, ring)) {
    return center;
  }

  const centroid = getPolygonCentroid(ring);
  if (centroid && (!activeBounds || isPointInAdminLabelBounds(centroid, activeBounds)) && pointInPolygon(centroid, ring)) {
    return centroid;
  }

  if (activeBounds) {
    const normalized = normalizeBounds(activeBounds);
    const sampleFractions = [0.5, 0.35, 0.65, 0.2, 0.8];
    for (const lngFraction of sampleFractions) {
      for (const latFraction of sampleFractions) {
        const point = {
          lng: normalized.minLng + (normalized.maxLng - normalized.minLng) * lngFraction,
          lat: normalized.minLat + (normalized.maxLat - normalized.minLat) * latFraction,
        };
        if (pointInPolygon(point, ring)) {
          return point;
        }
      }
    }
  }

  if (center && activeBounds) {
    return getNearestRingPointInBounds(center, ring, activeBounds);
  }

  return null;
}

function isPointInAnyRing(point: AdminLabelPoint, rings: AdminLabelPoint[][]) {
  return rings.some((ring) => pointInPolygon(point, ring));
}

function createPlacementResult(
  point: AdminLabelPoint | null,
  strategy: AdminLabelPlacementStrategy,
  feature: AdminLabelPlacementFeature,
  viewport: AdminLabelBounds | null | undefined,
): AdminLabelPlacementResult {
  return {
    point,
    strategy,
    diagnostics: {
      originalLabelPoint: feature.labelPosition ?? null,
      finalLabelPoint: point,
      inViewport: point && viewport ? isPointInAdminLabelBounds(point, viewport) : null,
      inPolygon: point ? isPointInAnyRing(point, feature.boundaries) : null,
      isMultiPolygon: feature.boundaries.length > 1,
    },
  };
}

function resolveViewportIntersectionPoint(
  feature: AdminLabelPlacementFeature,
  viewport: AdminLabelBounds,
) {
  const visible = pickLargestVisiblePolygon(feature.boundaries, viewport);
  if (!visible?.intersection) return null;

  return findRepresentativePointInRing(visible.ring, visible.intersection) ??
    getBoundsCenter(visible.intersection);
}

export function clampLabelToVisibleViewport(
  feature: AdminLabelPlacementFeature,
  viewport: AdminLabelBounds,
) {
  return resolveViewportIntersectionPoint(feature, viewport);
}

export function getRepresentativeLabelPoint(
  feature: AdminLabelPlacementFeature,
  viewport?: AdminLabelBounds | null,
  options: {
    viewportTileKey?: string | null;
    displayMode?: AmapCoordinateDisplayMode;
  } = {},
): AdminLabelPlacementResult {
  const cacheKey = getAdminLabelPlacementCacheKey({
    adcode: feature.adcode,
    level: feature.level,
    viewportTileKey: options.viewportTileKey,
    displayMode: options.displayMode ?? "raw",
  });
  const cached = adminLabelPlacementCache.get(cacheKey);
  if (cached) return cached;

  const override = feature.metadata?.labelPointOverride;
  if (isValidPoint(override)) {
    const result = createPlacementResult(override, "override", feature, viewport);
    rememberLabelPlacement(cacheKey, result);
    return result;
  }

  const originalLabelPoint = isValidPoint(feature.labelPosition) ? feature.labelPosition : null;
  const largestRing = pickLargestPolygon(feature.boundaries);

  if (
    viewport &&
    (!originalLabelPoint || !isPointInAdminLabelBounds(originalLabelPoint, viewport)) &&
    feature.boundaries.some((ring) => getBoundsIntersection(getAdminRingBounds(ring), viewport))
  ) {
    const viewportPoint = resolveViewportIntersectionPoint(feature, viewport);
    if (viewportPoint) {
      const result = createPlacementResult(viewportPoint, "viewport_intersection", feature, viewport);
      rememberLabelPlacement(cacheKey, result);
      return result;
    }
  }

  if (
    originalLabelPoint &&
    largestRing &&
    pointInPolygon(originalLabelPoint, largestRing)
  ) {
    const result = createPlacementResult(originalLabelPoint, "existing_label_point", feature, viewport);
    rememberLabelPlacement(cacheKey, result);
    return result;
  }

  if (largestRing) {
    const point = findRepresentativePointInRing(largestRing);
    if (point) {
      const result = createPlacementResult(point, "largest_polygon", feature, viewport);
      rememberLabelPlacement(cacheKey, result);
      return result;
    }
  }

  const bbox = feature.bbox ?? (largestRing ? getAdminRingBounds(largestRing) : null);
  if (bbox) {
    const point = getBoundsCenter(bbox);
    const result = createPlacementResult(point, "bbox_center", feature, viewport);
    rememberLabelPlacement(cacheKey, result);
    return result;
  }

  const result = createPlacementResult(feature.center ?? null, "center_fallback", feature, viewport);
  rememberLabelPlacement(cacheKey, result);
  return result;
}
