import type {
  AdminRegionImportRow,
  RawAdminRegionInput,
  NormalizedAdminRegion,
} from "./import-types.ts";
import { getBboxCenter, toMultiPolygonGeometry } from "./geometry.ts";
import {
  deriveAdminHierarchy,
  normalizeAdminLevel,
} from "./normalize-admin-level.ts";
import { validateNormalizedAdminRegions } from "./validate-admin-regions.ts";

export function normalizeAdminRegionInput(
  input: RawAdminRegionInput,
): NormalizedAdminRegion {
  const { level, adminType } = normalizeAdminLevel(input);
  const hierarchy = deriveAdminHierarchy({ ...input, level });
  const geometry = toMultiPolygonGeometry(input.geometry ?? null);
  const bbox = input.bbox ?? geometry.bbox;
  const center =
    input.center ??
    geometry.center ??
    (bbox ? getBboxCenter(bbox) : null);

  return {
    adcode: input.adcode.trim(),
    name: input.name.trim(),
    level,
    adminType,
    parentAdcode: hierarchy.parentAdcode,
    provinceAdcode: hierarchy.provinceAdcode,
    prefectureAdcode: hierarchy.prefectureAdcode,
    center,
    labelPoint: input.labelPoint ?? null,
    geometry: geometry.geometry,
    bbox,
    source: input.source ?? null,
    sourceId: input.sourceId ?? input.adcode,
    sourceUpdatedAt: input.sourceUpdatedAt ?? null,
    metadata: input.metadata ?? {},
  };
}

export function normalizeAdminRegionInputs(
  inputs: RawAdminRegionInput[],
): NormalizedAdminRegion[] {
  return inputs.map(normalizeAdminRegionInput);
}

export function mapAdminRegionToImportRow(
  region: NormalizedAdminRegion,
): AdminRegionImportRow {
  return {
    adcode: region.adcode,
    name: region.name,
    level: region.level,
    admin_type: region.adminType,
    parent_adcode: region.parentAdcode,
    province_adcode: region.provinceAdcode,
    prefecture_adcode: region.prefectureAdcode,
    center_lng: region.center?.lng ?? null,
    center_lat: region.center?.lat ?? null,
    label_lng: region.labelPoint?.lng ?? null,
    label_lat: region.labelPoint?.lat ?? null,
    boundary_geojson: region.geometry,
    bbox_min_lng: region.bbox?.[0] ?? null,
    bbox_min_lat: region.bbox?.[1] ?? null,
    bbox_max_lng: region.bbox?.[2] ?? null,
    bbox_max_lat: region.bbox?.[3] ?? null,
    source: region.source,
    source_id: region.sourceId,
    source_updated_at: region.sourceUpdatedAt,
    metadata: region.metadata ?? {},
  };
}

export function prepareAdminRegionImportRows(
  inputs: RawAdminRegionInput[],
  options: { externalAdcodes?: Iterable<string | null | undefined> } = {},
) {
  const normalized = normalizeAdminRegionInputs(inputs);
  const validation = validateNormalizedAdminRegions(normalized, options);
  const rows = normalized.map(mapAdminRegionToImportRow);

  return {
    normalized,
    validation,
    rows,
  };
}
