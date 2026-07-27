import type { AssetValidationResult, ContentAsset } from "./types.js";

const REQUIRED_FIELDS = [
  "id",
  "name",
  "asset_type",
  "category",
  "content_role",
  "traveler_fit",
  "season_fit",
  "experience_value",
] as const;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((item) => typeof item === "string");
}

export function validateAsset(raw: unknown): AssetValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return {
      valid: false,
      errors: ["asset must be a JSON object"],
    };
  }

  const record = raw as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (!(field in record)) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if (typeof record.id !== "string" || !record.id.trim()) {
    errors.push("id must be a non-empty string");
  }

  if (typeof record.name !== "string" || !record.name.trim()) {
    errors.push("name must be a non-empty string");
  }

  if (typeof record.asset_type !== "string" || !record.asset_type.trim()) {
    errors.push("asset_type must be a non-empty string");
  }

  if (
    !(typeof record.category === "string" && record.category.trim()) &&
    !(isStringArray(record.category) && record.category.length > 0)
  ) {
    errors.push("category must be a non-empty string or string array");
  }

  if (!isStringArray(record.content_role) || record.content_role.length === 0) {
    errors.push("content_role must be a non-empty string array");
  }

  const travelerFit = record.traveler_fit;
  if (!travelerFit || typeof travelerFit !== "object") {
    errors.push("traveler_fit must be an object");
  } else {
    const typedTravelerFit = travelerFit as Record<string, unknown>;
    for (const key of ["couple", "student", "solo"]) {
      if (typeof typedTravelerFit[key] !== "string" || !String(typedTravelerFit[key]).trim()) {
        errors.push(`traveler_fit.${key} must be a non-empty string`);
      }
    }
  }

  if (!isStringArray(record.season_fit) && !isStringRecord(record.season_fit)) {
    errors.push("season_fit must be a string array or season->fit object");
  }

  if (
    "best_time" in record &&
    !isStringArray(record.best_time) &&
    !(
      record.best_time &&
      typeof record.best_time === "object" &&
      !Array.isArray(record.best_time) &&
      isStringArray((record.best_time as Record<string, unknown>).time_of_day)
    )
  ) {
    errors.push("best_time must be a string array or { time_of_day: string[] } object");
  }

  if (
    !(
      isStringArray(record.experience_value) &&
      record.experience_value.length > 0
    ) &&
    !(
      record.experience_value &&
      typeof record.experience_value === "object" &&
      !Array.isArray(record.experience_value) &&
      isStringArray((record.experience_value as Record<string, unknown>).primary) &&
      typeof (record.experience_value as Record<string, unknown>).summary === "string"
    )
  ) {
    errors.push("experience_value must be a non-empty string array or { primary, summary } object");
  }

  if ("avoid_when" in record && !isStringArray(record.avoid_when)) {
    errors.push("avoid_when must be a string array");
  }

  if ("nearby_assets" in record && !isStringArray(record.nearby_assets)) {
    errors.push("nearby_assets must be a string array");
  }

  if ("map_asset_id" in record && typeof record.map_asset_id !== "string") {
    errors.push("map_asset_id must be a string");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeAsset(raw: unknown): ContentAsset {
  const asset = raw as Record<string, unknown>;
  const travelerFitRecord =
    asset.traveler_fit && typeof asset.traveler_fit === "object"
      ? Object.fromEntries(
          Object.entries(asset.traveler_fit as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value),
          ]),
        )
      : {};

  const seasonFit = Array.isArray(asset.season_fit)
    ? asset.season_fit.map((item) => String(item))
    : asset.season_fit && typeof asset.season_fit === "object"
      ? Object.entries(asset.season_fit as Record<string, unknown>)
          .filter(([, value]) => {
            const normalized = String(value).trim().toLowerCase();
            return normalized === "high" || normalized === "medium";
          })
          .map(([key]) => key)
      : [];

  const bestTime = Array.isArray(asset.best_time)
    ? asset.best_time.map((item) => String(item))
    : asset.best_time && typeof asset.best_time === "object"
      ? Array.isArray((asset.best_time as Record<string, unknown>).time_of_day)
        ? ((asset.best_time as Record<string, unknown>).time_of_day as unknown[]).map((item) => String(item))
        : []
      : [];

  const experienceValue = Array.isArray(asset.experience_value)
    ? asset.experience_value.map((item) => String(item))
    : asset.experience_value && typeof asset.experience_value === "object"
      ? [
          ...(
            Array.isArray((asset.experience_value as Record<string, unknown>).primary)
              ? ((asset.experience_value as Record<string, unknown>).primary as unknown[]).map((item) => String(item))
              : []
          ),
          typeof (asset.experience_value as Record<string, unknown>).summary === "string"
            ? String((asset.experience_value as Record<string, unknown>).summary)
            : "",
        ].filter(Boolean)
      : [];

  return {
    id: String(asset.id),
    name: String(asset.name),
    asset_type: String(asset.asset_type),
    category:
      typeof asset.category === "string"
        ? [asset.category]
        : Array.isArray(asset.category)
          ? asset.category.map((item) => String(item))
          : [],
    content_role: Array.isArray(asset.content_role) ? asset.content_role.map((item) => String(item)) : [],
    traveler_fit: {
      couple: travelerFitRecord.couple ?? "none",
      student: travelerFitRecord.student ?? "none",
      solo: travelerFitRecord.solo ?? "none",
      ...travelerFitRecord,
    },
    season_fit: seasonFit,
    best_time: bestTime,
    experience_value: experienceValue,
    avoid_when: Array.isArray(asset.avoid_when) ? asset.avoid_when.map((item) => String(item)) : [],
    nearby_assets: Array.isArray(asset.nearby_assets) ? asset.nearby_assets.map((item) => String(item)) : [],
    map_asset_id: typeof asset.map_asset_id === "string" ? asset.map_asset_id : "",
  };
}
