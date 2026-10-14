import type {
  AdminRegionImportSummary,
  NormalizedAdminRegion,
} from "./import-types.ts";
import { isValidBbox, isValidLngLat } from "./geometry.ts";
import { isAdminRegionLevel } from "./normalize-admin-level.ts";

export interface AdminRegionValidationIssue {
  adcode: string;
  severity: "error" | "warning";
  code:
    | "duplicate_adcode"
    | "invalid_level"
    | "missing_parent"
    | "missing_province"
    | "missing_prefecture"
    | "invalid_county_hierarchy"
    | "invalid_geometry"
    | "missing_geometry"
    | "invalid_bbox"
    | "invalid_coordinate";
  message: string;
}

export interface AdminRegionValidationResult {
  valid: boolean;
  summary: AdminRegionImportSummary;
  issues: AdminRegionValidationIssue[];
}

export interface AdminRegionValidationOptions {
  externalAdcodes?: Iterable<string | null | undefined>;
}

function emptySummary(total: number): AdminRegionImportSummary {
  return {
    total,
    upserted: 0,
    country: 0,
    province: 0,
    prefecture: 0,
    county: 0,
    missingGeometry: 0,
    invalidParent: 0,
    failed: 0,
  };
}

function pushIssue(
  issues: AdminRegionValidationIssue[],
  issue: AdminRegionValidationIssue,
) {
  issues.push(issue);
}

export function validateNormalizedAdminRegions(
  regions: NormalizedAdminRegion[],
  options: AdminRegionValidationOptions = {},
): AdminRegionValidationResult {
  const summary = emptySummary(regions.length);
  const issues: AdminRegionValidationIssue[] = [];
  const seen = new Set<string>();
  const byAdcode = new Map<string, NormalizedAdminRegion>();
  const externalAdcodes = new Set(
    [...(options.externalAdcodes ?? [])]
      .filter((adcode): adcode is string => typeof adcode === "string" && adcode.trim().length > 0)
      .map((adcode) => adcode.trim()),
  );

  for (const region of regions) {
    if (seen.has(region.adcode)) {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "duplicate_adcode",
        message: `Duplicate adcode: ${region.adcode}`,
      });
    }
    seen.add(region.adcode);
    byAdcode.set(region.adcode, region);
  }

  for (const region of regions) {
    if (!isAdminRegionLevel(region.level)) {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "invalid_level",
        message: `Invalid admin level: ${region.level}`,
      });
    } else {
      summary[region.level] += 1;
    }

    if (region.parentAdcode && !byAdcode.has(region.parentAdcode) && !externalAdcodes.has(region.parentAdcode)) {
      summary.invalidParent += 1;
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "missing_parent",
        message: `parentAdcode ${region.parentAdcode} is not present in dataset`,
      });
    }

    if (region.provinceAdcode && !byAdcode.has(region.provinceAdcode) && !externalAdcodes.has(region.provinceAdcode)) {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "missing_province",
        message: `provinceAdcode ${region.provinceAdcode} is not present in dataset`,
      });
    }

    if (region.prefectureAdcode && !byAdcode.has(region.prefectureAdcode) && !externalAdcodes.has(region.prefectureAdcode)) {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "missing_prefecture",
        message: `prefectureAdcode ${region.prefectureAdcode} is not present in dataset`,
      });
    }

    if (
      region.level === "county" &&
      region.prefectureAdcode &&
      region.parentAdcode !== region.prefectureAdcode
    ) {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "warning",
        code: "invalid_county_hierarchy",
        message: "county parentAdcode differs from prefectureAdcode; verify special administrative structure",
      });
    }

    if (!region.geometry) {
      summary.missingGeometry += 1;
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "warning",
        code: "missing_geometry",
        message: "geometry is empty; row can be imported, but boundary will be null",
      });
    } else if (region.geometry.type !== "MultiPolygon") {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "invalid_geometry",
        message: "geometry must be MultiPolygon",
      });
    }

    if (!isValidBbox(region.bbox)) {
      pushIssue(issues, {
        adcode: region.adcode,
        severity: "error",
        code: "invalid_bbox",
        message: "bbox is invalid",
      });
    }

    for (const [label, point] of [
      ["center", region.center],
      ["labelPoint", region.labelPoint ?? null],
    ] as const) {
      if (point && !isValidLngLat(point.lng, point.lat)) {
        pushIssue(issues, {
          adcode: region.adcode,
          severity: "error",
          code: "invalid_coordinate",
          message: `${label} has invalid lng/lat`,
        });
      }
    }
  }

  summary.failed = issues.filter((issue) => issue.severity === "error").length;

  return {
    valid: summary.failed === 0,
    summary,
    issues,
  };
}
