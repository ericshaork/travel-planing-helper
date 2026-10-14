import type { AdminRegionLevel } from "./types.ts";
import type {
  AdminRegionAdminType,
  RawAdminRegionInput,
} from "./import-types.ts";

export interface NormalizedAdminLevelResult {
  level: AdminRegionLevel;
  adminType: AdminRegionAdminType | string;
}

const ALLOWED_LEVELS = new Set<AdminRegionLevel>([
  "country",
  "province",
  "prefecture",
  "county",
]);

export function isAdminRegionLevel(value: string): value is AdminRegionLevel {
  return ALLOWED_LEVELS.has(value as AdminRegionLevel);
}

function normalizeAdcode(adcode: string) {
  return adcode.trim();
}

function inferLevelFromAdcode(adcode: string): AdminRegionLevel {
  const normalized = normalizeAdcode(adcode);

  if (normalized === "100000") {
    return "country";
  }

  if (/^\d{2}0000$/.test(normalized)) {
    return "province";
  }

  if (/^\d{4}00$/.test(normalized)) {
    return "prefecture";
  }

  return "county";
}

function inferAdminType(input: Pick<RawAdminRegionInput, "name" | "adcode"> & {
  level: AdminRegionLevel;
}): AdminRegionAdminType {
  const { adcode, level, name } = input;

  if (level === "country") {
    return "country";
  }

  if (level === "province") {
    if (name.endsWith("特别行政区")) return "special_administrative_region";
    if (name.endsWith("自治区")) return "autonomous_region";
    if (["110000", "120000", "310000", "500000"].includes(adcode)) {
      return "municipality";
    }
    return "province";
  }

  if (level === "prefecture") {
    if (["441900", "442000"].includes(adcode)) {
      return "prefecture_city_direct_township";
    }
    if (name.endsWith("自治州")) return "autonomous_prefecture";
    if (name.endsWith("地区")) return "prefecture";
    if (name.endsWith("盟")) return "league";
    return "prefecture_city";
  }

  if (name.endsWith("自治县")) return "autonomous_county";
  if (name.endsWith("自治旗")) return "autonomous_banner";
  if (name.endsWith("旗")) return "banner";
  if (name.endsWith("区")) return "district";
  if (name.endsWith("市")) return "county_level_city";
  if (name.endsWith("县")) return "county";

  return "unknown";
}

export function normalizeAdminLevel(
  input: RawAdminRegionInput,
): NormalizedAdminLevelResult {
  const inferredLevel = inferLevelFromAdcode(input.adcode);
  const level = input.level && isAdminRegionLevel(input.level)
    ? input.level
    : inferredLevel;

  return {
    level,
    adminType: input.adminType?.trim() || inferAdminType({
      adcode: normalizeAdcode(input.adcode),
      name: input.name,
      level,
    }),
  };
}

export function deriveAdminHierarchy(input: RawAdminRegionInput & {
  level: AdminRegionLevel;
}) {
  const adcode = normalizeAdcode(input.adcode);
  const parentAdcode = input.parentAdcode?.trim() || null;
  const provinceAdcode =
    input.provinceAdcode?.trim() ||
    (input.level === "province" ? adcode : null);
  const prefectureAdcode =
    input.prefectureAdcode?.trim() ||
    (input.level === "prefecture" ? adcode : null);

  return {
    parentAdcode,
    provinceAdcode,
    prefectureAdcode,
  };
}
