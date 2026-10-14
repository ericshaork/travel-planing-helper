export interface AuditPoint {
  lng: number;
  lat: number;
}

export type AuditBbox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export interface AuditGeometry {
  type: string;
  coordinates?: unknown;
}

export interface GeometryComplexityStats {
  hasGeometry: boolean;
  isMultiPolygon: boolean;
  polygonCount: number;
  ringCount: number;
  exteriorRingCount: number;
  interiorRingCount: number;
  vertexCount: number;
  maxRingVertexCount: number;
  bbox: AuditBbox | null;
  bboxWidth: number | null;
  bboxHeight: number | null;
  bboxAreaApprox: number | null;
}

export interface LabelPointQuality {
  hasLabelPoint: boolean;
  insideBbox: boolean | null;
  insidePolygon: boolean | null;
  insideLargestPolygonBbox: boolean | null;
}

export interface LocalRemoteGeometryComparison {
  adcode: string;
  localVertexCount: number | null;
  remoteVertexCount: number | null;
  vertexCountDelta: number | null;
  localBbox: AuditBbox | null;
  remoteBbox: AuditBbox | null;
  bboxMatches: boolean | null;
  labelPointMatches: boolean | null;
}

const CHINA_LNG_RANGE = [70, 140] as const;
const CHINA_LAT_RANGE = [0, 60] as const;
const EARTH_RADIUS_METERS = 6371008.8;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parsePosition(value: unknown): AuditPoint | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const lng = Number(value[0]);
  const lat = Number(value[1]);

  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

function getPolygonCoordinates(geometry: AuditGeometry | null | undefined): unknown[] {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  if (geometry.type === "Polygon") {
    return [geometry.coordinates];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates;
  }

  return [];
}

function getRingPoints(ring: unknown): AuditPoint[] {
  if (!Array.isArray(ring)) {
    return [];
  }

  return ring
    .map(parsePosition)
    .filter((point): point is AuditPoint => point !== null);
}

export function computeGeometryComplexityStats(
  geometry: AuditGeometry | null | undefined,
): GeometryComplexityStats {
  const polygons = getPolygonCoordinates(geometry);
  let ringCount = 0;
  let exteriorRingCount = 0;
  let interiorRingCount = 0;
  let vertexCount = 0;
  let maxRingVertexCount = 0;
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    if (!Array.isArray(polygon)) {
      continue;
    }

    polygon.forEach((ring, ringIndex) => {
      const points = getRingPoints(ring);

      if (points.length === 0) {
        return;
      }

      ringCount += 1;
      if (ringIndex === 0) exteriorRingCount += 1;
      else interiorRingCount += 1;
      vertexCount += points.length;
      maxRingVertexCount = Math.max(maxRingVertexCount, points.length);

      for (const point of points) {
        minLng = Math.min(minLng, point.lng);
        minLat = Math.min(minLat, point.lat);
        maxLng = Math.max(maxLng, point.lng);
        maxLat = Math.max(maxLat, point.lat);
      }
    });
  }

  const bbox = Number.isFinite(minLng)
    ? [minLng, minLat, maxLng, maxLat] as AuditBbox
    : null;
  const bboxWidth = bbox ? bbox[2] - bbox[0] : null;
  const bboxHeight = bbox ? bbox[3] - bbox[1] : null;

  return {
    hasGeometry: polygons.length > 0 && vertexCount > 0,
    isMultiPolygon: geometry?.type === "MultiPolygon",
    polygonCount: polygons.length,
    ringCount,
    exteriorRingCount,
    interiorRingCount,
    vertexCount,
    maxRingVertexCount,
    bbox,
    bboxWidth,
    bboxHeight,
    bboxAreaApprox: bboxWidth !== null && bboxHeight !== null ? bboxWidth * bboxHeight : null,
  };
}

export function isLikelyLngLatReversed(point: AuditPoint | null | undefined) {
  if (!point) {
    return false;
  }

  return (
    point.lng >= CHINA_LAT_RANGE[0] &&
    point.lng <= CHINA_LAT_RANGE[1] &&
    point.lat >= CHINA_LNG_RANGE[0] &&
    point.lat <= CHINA_LNG_RANGE[1]
  );
}

export function getCoordinateRangeIssues(input: {
  center?: AuditPoint | null;
  labelPoint?: AuditPoint | null;
  bbox?: AuditBbox | null;
}) {
  const issues: string[] = [];
  const points = [
    ["center", input.center],
    ["labelPoint", input.labelPoint],
  ] as const;

  for (const [name, point] of points) {
    if (!point) continue;
    if (point.lng === 0 && point.lat === 0) issues.push(`${name}:zero_point`);
    if (
      point.lng < CHINA_LNG_RANGE[0] ||
      point.lng > CHINA_LNG_RANGE[1] ||
      point.lat < CHINA_LAT_RANGE[0] ||
      point.lat > CHINA_LAT_RANGE[1]
    ) {
      issues.push(`${name}:outside_china_range`);
    }
    if (isLikelyLngLatReversed(point)) {
      issues.push(`${name}:likely_lng_lat_reversed`);
    }
  }

  if (input.bbox) {
    const [minLng, minLat, maxLng, maxLat] = input.bbox;
    if (minLng >= maxLng || minLat >= maxLat) issues.push("bbox:invalid_order");
    if (
      minLng < CHINA_LNG_RANGE[0] ||
      maxLng > CHINA_LNG_RANGE[1] ||
      minLat < CHINA_LAT_RANGE[0] ||
      maxLat > CHINA_LAT_RANGE[1]
    ) {
      issues.push("bbox:outside_china_range");
    }
    if (
      minLng >= CHINA_LAT_RANGE[0] &&
      maxLng <= CHINA_LAT_RANGE[1] &&
      minLat >= CHINA_LNG_RANGE[0] &&
      maxLat <= CHINA_LNG_RANGE[1]
    ) {
      issues.push("bbox:likely_lng_lat_reversed");
    }
  }

  return issues;
}

export function isPointInsideBbox(point: AuditPoint, bbox: AuditBbox) {
  return (
    point.lng >= bbox[0] &&
    point.lng <= bbox[2] &&
    point.lat >= bbox[1] &&
    point.lat <= bbox[3]
  );
}

export function getRingBbox(points: AuditPoint[]): AuditBbox | null {
  if (points.length === 0) {
    return null;
  }

  return points.reduce<AuditBbox>(
    (bbox, point) => [
      Math.min(bbox[0], point.lng),
      Math.min(bbox[1], point.lat),
      Math.max(bbox[2], point.lng),
      Math.max(bbox[3], point.lat),
    ],
    [points[0]!.lng, points[0]!.lat, points[0]!.lng, points[0]!.lat],
  );
}

function getRingSignedArea(points: AuditPoint[]) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.lng * next.lat - next.lng * current.lat;
  }

  return area / 2;
}

function pointInRing(point: AuditPoint, ring: AuditPoint[]) {
  let inside = false;

  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index, index += 1
  ) {
    const current = ring[index]!;
    const previous = ring[previousIndex]!;
    const intersects =
      current.lat > point.lat !== previous.lat > point.lat &&
      point.lng <
        ((previous.lng - current.lng) * (point.lat - current.lat)) /
          (previous.lat - current.lat || Number.EPSILON) +
          current.lng;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function isPointInsideGeometry(
  point: AuditPoint,
  geometry: AuditGeometry | null | undefined,
) {
  const polygons = getPolygonCoordinates(geometry);

  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      continue;
    }

    const exterior = getRingPoints(polygon[0]);
    if (exterior.length < 3 || !pointInRing(point, exterior)) {
      continue;
    }

    const inHole = polygon
      .slice(1)
      .some((ring) => {
        const points = getRingPoints(ring);
        return points.length >= 3 && pointInRing(point, points);
      });

    if (!inHole) {
      return true;
    }
  }

  return false;
}

export function getLargestExteriorRingBbox(
  geometry: AuditGeometry | null | undefined,
): AuditBbox | null {
  const polygons = getPolygonCoordinates(geometry);
  let largest: { area: number; bbox: AuditBbox } | null = null;

  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      continue;
    }

    const exterior = getRingPoints(polygon[0]);
    if (exterior.length < 3) {
      continue;
    }

    const bbox = getRingBbox(exterior);
    if (!bbox) {
      continue;
    }

    const area = Math.abs(getRingSignedArea(exterior));
    if (!largest || area > largest.area) {
      largest = { area, bbox };
    }
  }

  return largest?.bbox ?? null;
}

export function analyzeLabelPointQuality(input: {
  labelPoint?: AuditPoint | null;
  bbox?: AuditBbox | null;
  geometry?: AuditGeometry | null;
}): LabelPointQuality {
  const labelPoint = input.labelPoint ?? null;
  const largestPolygonBbox = getLargestExteriorRingBbox(input.geometry);

  return {
    hasLabelPoint: Boolean(labelPoint),
    insideBbox: labelPoint && input.bbox ? isPointInsideBbox(labelPoint, input.bbox) : null,
    insidePolygon: labelPoint && input.geometry
      ? isPointInsideGeometry(labelPoint, input.geometry)
      : null,
    insideLargestPolygonBbox: labelPoint && largestPolygonBbox
      ? isPointInsideBbox(labelPoint, largestPolygonBbox)
      : null,
  };
}

export function haversineDistanceMeters(left: AuditPoint, right: AuditPoint) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function outOfChina(point: AuditPoint) {
  return point.lng < 72.004 || point.lng > 137.8347 || point.lat < 0.8293 || point.lat > 55.8271;
}

function transformLat(lng: number, lat: number) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(lng: number, lat: number) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
  return ret;
}

export function wgs84ToGcj02(point: AuditPoint): AuditPoint {
  if (outOfChina(point)) {
    return point;
  }

  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformLat(point.lng - 105.0, point.lat - 35.0);
  let dLng = transformLng(point.lng - 105.0, point.lat - 35.0);
  const radLat = point.lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);

  return {
    lng: point.lng + dLng,
    lat: point.lat + dLat,
  };
}

export function compareLocalRemoteGeometry(input: {
  adcode: string;
  local?: {
    geometry?: AuditGeometry | null;
    bbox?: AuditBbox | null;
    labelPoint?: [number, number] | null;
  } | null;
  remote?: {
    geometry?: AuditGeometry | null;
    bbox?: AuditBbox | null;
    labelPoint?: [number, number] | null;
  } | null;
}): LocalRemoteGeometryComparison {
  const localStats = input.local ? computeGeometryComplexityStats(input.local.geometry) : null;
  const remoteStats = input.remote ? computeGeometryComplexityStats(input.remote.geometry) : null;
  const localBbox = input.local?.bbox ?? localStats?.bbox ?? null;
  const remoteBbox = input.remote?.bbox ?? remoteStats?.bbox ?? null;
  const bboxMatches = localBbox && remoteBbox
    ? localBbox.every((value, index) => Math.abs(value - remoteBbox[index]!) < 0.00001)
    : null;
  const labelPointMatches = input.local?.labelPoint && input.remote?.labelPoint
    ? input.local.labelPoint.every((value, index) => Math.abs(value - input.remote!.labelPoint![index]!) < 0.00001)
    : null;

  return {
    adcode: input.adcode,
    localVertexCount: localStats?.vertexCount ?? null,
    remoteVertexCount: remoteStats?.vertexCount ?? null,
    vertexCountDelta: localStats && remoteStats
      ? remoteStats.vertexCount - localStats.vertexCount
      : null,
    localBbox,
    remoteBbox,
    bboxMatches,
    labelPointMatches,
  };
}

export function formatPoint(point: AuditPoint | [number, number] | null | undefined) {
  if (!point) {
    return "null";
  }

  const lng = Array.isArray(point) ? point[0] : point.lng;
  const lat = Array.isArray(point) ? point[1] : point.lat;
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

export function formatBbox(bbox: AuditBbox | null | undefined) {
  return bbox ? bbox.map((value) => value.toFixed(6)).join(",") : "null";
}
