export type AmapCoordinateDisplayMode = "raw" | "gcj02" | "debug_both";

export interface CoordinateTransformOptions {
  displayMode?: AmapCoordinateDisplayMode;
  adcode?: string | null;
  parentAdcode?: string | null;
}

const A = 6378245.0;
const EE = 0.00669342162296594323;
const MAINLAND_MIN_LNG = 72.004;
const MAINLAND_MAX_LNG = 137.8347;
const MAINLAND_MIN_LAT = 0.8293;
const MAINLAND_MAX_LAT = 55.8271;

function isSpecialRegionAdcode(adcode: string | null | undefined) {
  return Boolean(adcode && /^(71|81|82)\d{4}$/.test(adcode));
}

function isLikelyTaiwan(lng: number, lat: number) {
  return lng >= 119.3 && lng <= 122.1 && lat >= 21.8 && lat <= 25.5;
}

export function isInChina(
  lng: number,
  lat: number,
  options: Pick<CoordinateTransformOptions, "adcode" | "parentAdcode"> = {},
) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return false;
  }

  if (isSpecialRegionAdcode(options.adcode) || isSpecialRegionAdcode(options.parentAdcode)) {
    return false;
  }

  if (isLikelyTaiwan(lng, lat)) {
    return false;
  }

  return (
    lng >= MAINLAND_MIN_LNG &&
    lng <= MAINLAND_MAX_LNG &&
    lat >= MAINLAND_MIN_LAT &&
    lat <= MAINLAND_MAX_LAT
  );
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

export function wgs84ToGcj02(
  lng: number,
  lat: number,
  options: Pick<CoordinateTransformOptions, "adcode" | "parentAdcode"> = {},
): [number, number] {
  if (!isInChina(lng, lat, options)) {
    return [lng, lat];
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * Math.PI);

  return [lng + dLng, lat + dLat];
}

export function transformLngLatForAmap(
  lng: number,
  lat: number,
  options: CoordinateTransformOptions = {},
): [number, number] {
  if (options.displayMode === "raw") {
    return [lng, lat];
  }

  return wgs84ToGcj02(lng, lat, options);
}

export function estimateCoordinateDeltaMeters(
  left: [number, number],
  right: [number, number],
) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusMeters = 6371008.8;
  const lat1 = toRadians(left[1]);
  const lat2 = toRadians(right[1]);
  const dLat = toRadians(right[1] - left[1]);
  const dLng = toRadians(right[0] - left[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
