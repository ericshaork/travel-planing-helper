import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  auditAdminTopology,
  formatAdminTopologyAuditMarkdown,
  getDefaultAdminTopologyInputFiles,
  type AdminTopologyAuditLevel,
  type AdminTopologySample,
} from "../src/server/data-hub/admin/topologyAudit.ts";
import type { NormalizedAdminRegion } from "../src/server/data-hub/admin/import-types.ts";

type CliArgs = {
  level: AdminTopologyAuditLevel | "all";
  sample: AdminTopologySample;
  tolerance?: number;
  writeReport: boolean;
  reportPath: string;
};

function parseArgs(argv: string[]): CliArgs {
  const parsed: Record<string, string | boolean> = {};

  for (const item of argv) {
    if (item.startsWith("--") && item.includes("=")) {
      const [key, ...value] = item.slice(2).split("=");
      parsed[key] = value.join("=");
      continue;
    }

    if (item.startsWith("--")) {
      parsed[item.slice(2)] = true;
    }
  }

  const level = parseLevel(typeof parsed.level === "string" ? parsed.level : "all");
  const sample = parseSample(typeof parsed.sample === "string" ? parsed.sample : "focus");
  const tolerance = typeof parsed.tolerance === "string"
    ? Number(parsed.tolerance)
    : undefined;

  if (typeof tolerance === "number" && !Number.isFinite(tolerance)) {
    throw new Error("--tolerance must be a finite number.");
  }

  return {
    level,
    sample,
    tolerance,
    writeReport: parsed["write-report"] === true,
    reportPath: typeof parsed.report === "string"
      ? parsed.report
      : "docs/WANDERLY_V2_ADMIN_TOPOLOGY_AUDIT.md",
  };
}

function parseLevel(value: string): AdminTopologyAuditLevel | "all" {
  if (
    value === "province" ||
    value === "prefecture" ||
    value === "county" ||
    value === "all"
  ) {
    return value;
  }

  throw new Error("--level must be province, prefecture, county, or all.");
}

function parseSample(value: string): AdminTopologySample {
  if (
    value === "guangdong" ||
    value === "coastal" ||
    value === "national" ||
    value === "focus"
  ) {
    return value;
  }

  throw new Error("--sample must be guangdong, coastal, national, or focus.");
}

function readNormalizedRegions(filePath: string) {
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Normalized admin file not found: ${filePath}`);
  }

  const parsed = JSON.parse(readFileSync(absolutePath, "utf8")) as {
    regions?: NormalizedAdminRegion[];
  };

  if (!Array.isArray(parsed.regions)) {
    throw new Error(`Normalized admin file must contain regions array: ${filePath}`);
  }

  return parsed.regions;
}

function writeTextFile(filePath: string, content: string) {
  const absolutePath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputFiles = getDefaultAdminTopologyInputFiles();
  const result = auditAdminTopology({
    provinceRegions: readNormalizedRegions(inputFiles.province),
    prefectureRegions: readNormalizedRegions(inputFiles.prefecture),
    countyRegions: readNormalizedRegions(inputFiles.county),
    level: args.level,
    sample: args.sample,
    tolerance: args.tolerance,
  });
  const summary = {
    mode: "admin_topology_audit",
    status: "ok",
    generatedAt: result.generatedAt,
    level: result.level,
    sample: result.sample,
    tolerance: result.tolerance,
    summaries: result.summaries.map((item) => ({
      level: item.level,
      regionCount: item.regionCount,
      rawSegmentCount: item.rawSegmentCount,
      uniqueSegmentCount: item.uniqueSegmentCount,
      exactSharedSegmentCount: item.exactSharedSegmentCount,
      exactSharedRatio: item.exactSharedRatio,
      nearDuplicateSegmentCount: item.nearDuplicateSegmentCount,
      nearDuplicateRatio: item.nearDuplicateRatio,
      unmatchedSegmentCount: item.unmatchedSegmentCount,
      ignoredInteriorRingCount: item.ignoredInteriorRingCount,
    })),
    focusPairs: result.focusPairs.map((item) => ({
      label: item.label,
      level: item.level,
      rawSegmentsA: item.rawSegmentsA,
      rawSegmentsB: item.rawSegmentsB,
      exactSharedSegments: item.exactSharedSegments,
      nearDuplicateSegments: item.nearDuplicateSegments,
    })),
    parentChildMismatches: result.parentChildMismatches.map((item) => ({
      label: item.label,
      parentLevel: item.parentLevel,
      childLevel: item.childLevel,
      childCount: item.childCount,
      exactCoverageRatio: item.exactCoverageRatio,
      nearCoverageRatio: item.nearCoverageRatio,
    })),
    reportPath: args.writeReport ? args.reportPath : null,
  };

  if (args.writeReport) {
    writeTextFile(args.reportPath, formatAdminTopologyAuditMarkdown(result));
  }

  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(JSON.stringify({
    mode: "admin_topology_audit",
    status: "failed",
    error: {
      code: "admin_topology_audit_failed",
      message: error instanceof Error ? error.message : "Admin topology audit failed.",
    },
  }, null, 2));
  process.exitCode = 1;
}
