import type {
  AdminRegionBbox,
  AdminRegionPoint,
  GeoJsonLinearRing,
  GeoJsonMultiPolygonCoordinates,
  GeoJsonPolygonCoordinates,
  ImportableAdminGeometry,
  NormalizedMultiPolygonGeometry,
} from "./import-types.ts";

export interface GeometryNormalizationResult {
  geometry: NormalizedMultiPolygonGeometry | null;
  bbox: AdminRegionBbox | null;
  center: AdminRegionPoint | null;
  errors: string[];
}

export function isValidLngLat(lng: number, lat: number) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function isValidPosition(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }

  return isValidLngLat(Number(value[0]), Number(value[1]));
}

function validateLinearRing(ring: GeoJsonLinearRing, path: string) {
  const errors: string[] = [];

  if (!Array.isArray(ring) || ring.length < 4) {
    errors.push(`${path} must contain at least 4 positions`);
    return errors;
  }

  ring.forEach((position, index) => {
    if (!isValidPosition(position)) {
      errors.push(`${path}[${index}] has invalid lng/lat`);
    }
  });

  return errors;
}

function validatePolygon(polygon: GeoJsonPolygonCoordinates, path: string) {
  const errors: string[] = [];

  if (!Array.isArray(polygon) || polygon.length === 0) {
    errors.push(`${path} must contain at least one linear ring`);
    return errors;
  }

  polygon.forEach((ring, index) => {
    errors.push(...validateLinearRing(ring, `${path}[${index}]`));
  });

  return errors;
}

export function toMultiPolygonGeometry(
  geometry: ImportableAdminGeometry | null | undefined,
): GeometryNormalizationResult {
  if (!geometry) {
    return {
      geometry: null,
      bbox: null,
      center: null,
      errors: [],
    };
  }

  const multiPolygon: GeoJsonMultiPolygonCoordinates =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];

  const errors: string[] = [];

  if (multiPolygon.length === 0) {
    errors.push("geometry must be Polygon or MultiPolygon");
  }

  multiPolygon.forEach((polygon, index) => {
    errors.push(...validatePolygon(polygon, `coordinates[${index}]`));
  });

  if (errors.length > 0) {
    return {
      geometry: null,
      bbox: null,
      center: null,
      errors,
    };
  }

  const normalized: NormalizedMultiPolygonGeometry = {
    type: "MultiPolygon",
    coordinates: multiPolygon,
  };

  const bbox = computeGeometryBbox(normalized);

  return {
    geometry: normalized,
    bbox,
    center: bbox ? getBboxCenter(bbox) : null,
    errors: [],
  };
}

export function computeGeometryBbox(
  geometry: NormalizedMultiPolygonGeometry,
): AdminRegionBbox | null {
  const positions = geometry.coordinates.flat(2);

  if (positions.length === 0) {
    return null;
  }

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const position of positions) {
    const lng = Number(position[0]);
    const lat = Number(position[1]);
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    return null;
  }

  return [minLng, minLat, maxLng, maxLat];
}

export function getBboxCenter(bbox: AdminRegionBbox): AdminRegionPoint {
  return {
    lng: (bbox[0] + bbox[2]) / 2,
    lat: (bbox[1] + bbox[3]) / 2,
  };
}

export function isValidBbox(bbox: AdminRegionBbox | null | undefined) {
  if (!bbox) {
    return true;
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;

  return (
    isValidLngLat(minLng, minLat) &&
    isValidLngLat(maxLng, maxLat) &&
    minLng <= maxLng &&
    minLat <= maxLat
  );
}
