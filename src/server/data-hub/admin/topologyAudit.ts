import type {
  AdminRegionBbox,
  GeoJsonLinearRing,
  GeoJsonMultiPolygonCoordinates,
  NormalizedAdminRegion,
  NormalizedMultiPolygonGeometry,
} from "./import-types.ts";

export type AdminTopologyAuditLevel = "province" | "prefecture" | "county";

export type AdminTopologySample =
  | "guangdong"
  | "coastal"
  | "national"
  | "focus";

export interface AdminTopologyAuditInput {
  provinceRegions?: NormalizedAdminRegion[];
  prefectureRegions?: NormalizedAdminRegion[];
  countyRegions?: NormalizedAdminRegion[];
  level?: AdminTopologyAuditLevel | "all";
  sample?: AdminTopologySample;
  tolerance?: number;
}

export interface AdminTopologySegment {
  id: string;
  level: AdminTopologyAuditLevel;
  adcode: string;
  name: string;
  parentAdcode: string | null;
  provinceAdcode: string | null;
  prefectureAdcode: string | null;
  start: AdminTopologyPoint;
  end: AdminTopologyPoint;
  canonicalKey: string;
  snappedKey: string;
  nearKey: string;
  bbox: AdminRegionBbox;
  lengthApprox: number;
  polygonIndex: number;
  ringIndex: number;
  ringRole: "exterior";
  sourcePolygonCount: number;
}

export interface AdminTopologyPoint {
  lng: number;
  lat: number;
}

export interface AdminTopologyLevelSummary {
  level: AdminTopologyAuditLevel;
  regionCount: number;
  regionsWithGeometry: number;
  polygonCount: number;
  exteriorRingCount: number;
  ignoredInteriorRingCount: number;
  rawSegmentCount: number;
  uniqueSegmentCount: number;
  exactSharedSegmentCount: number;
  exactSharedRatio: number;
  nearDuplicateSegmentCount: number;
  nearDuplicateRatio: number;
  unmatchedSegmentCount: number;
  likelyOuterBoundary: number;
  likelyMissingNeighbor: number;
  likelyIslandOrCoast: number;
  unknownUnmatched: number;
  tolerance: number;
  nearDuplicatePairsSample: AdminNearDuplicateSample[];
  unmatchedSamples: AdminUnmatchedSegmentSample[];
}

export interface AdminNearDuplicateSample {
  snappedKey: string;
  segmentA: AdminSegmentSample;
  segmentB: AdminSegmentSample;
  distanceApprox: number;
}

export interface AdminUnmatchedSegmentSample {
  segment: AdminSegmentSample;
  classification: AdminUnmatchedClassification;
}

export type AdminUnmatchedClassification =
  | "likelyOuterBoundary"
  | "likelyMissingNeighbor"
  | "likelyIslandOrCoast"
  | "unknownUnmatched";

export interface AdminSegmentSample {
  level: AdminTopologyAuditLevel;
  adcode: string;
  name: string;
  parentAdcode: string | null;
  start: AdminTopologyPoint;
  end: AdminTopologyPoint;
  canonicalKey: string;
  bbox: AdminRegionBbox;
  lengthApprox: number;
}

export interface AdminTopologyPairSummary {
  label: string;
  level: AdminTopologyAuditLevel;
  adcodeA: string;
  nameA: string;
  adcodeB: string;
  nameB: string;
  rawSegmentsA: number;
  rawSegmentsB: number;
  exactSharedSegments: number;
  nearDuplicateSegments: number;
  unmatchedNearDuplicateSamples: AdminNearDuplicateSample[];
}

export interface AdminParentChildMismatchSummary {
  label: string;
  parentLevel: "province" | "prefecture";
  childLevel: "prefecture" | "county";
  parentAdcode: string;
  parentName: string;
  childCount: number;
  parentRawSegments: number;
  childRawSegments: number;
  exactMatchedParentSegments: number;
  nearMatchedParentSegments: number;
  exactCoverageRatio: number;
  nearCoverageRatio: number;
}

export interface AdminTopologyAuditResult {
  generatedAt: string;
  inputFiles: Record<AdminTopologyAuditLevel, string>;
  level: AdminTopologyAuditLevel | "all";
  sample: AdminTopologySample;
  tolerance: number;
  summaries: AdminTopologyLevelSummary[];
  focusPairs: AdminTopologyPairSummary[];
  parentChildMismatches: AdminParentChildMismatchSummary[];
  rootCauseJudgement: string[];
}

const DEFAULT_TOLERANCE = 0.0005;

const GUANGDONG_ADCODE = "440000";
const GUANGXI_ADCODE = "450000";
const HUNAN_ADCODE = "430000";

const FOCUS_PREFECTURE_PAIRS = [
  ["440300", "441900", "深圳 / 东莞"],
  ["440100", "440600", "广州 / 佛山"],
  ["441300", "441900", "惠州 / 东莞"],
] as const;

const FOCUS_PROVINCE_PAIRS = [
  ["440000", "450000", "广东 / 广西"],
  ["440000", "430000", "广东 / 湖南"],
] as const;

const YANGTZE_DELTA_PREFECTURE_PAIRS = [
  ["310000", "320500", "上海 / 苏州"],
  ["320100", "320500", "南京 / 苏州"],
  ["330100", "330500", "杭州 / 湖州"],
] as const;

export function getDefaultAdminTopologyInputFiles() {
  return {
    province: "data/admin/normalized/china-province-admin-regions.geometry.json",
    prefecture: "data/admin/normalized/china-prefecture-admin-regions.geometry.json",
    county: "data/admin/normalized/china-county-admin-regions.geometry.json",
  } satisfies Record<AdminTopologyAuditLevel, string>;
}

export function extractAdminTopologySegments(
  regions: NormalizedAdminRegion[],
  level: AdminTopologyAuditLevel,
  tolerance = DEFAULT_TOLERANCE,
) {
  const segments: AdminTopologySegment[] = [];
  let polygonCount = 0;
  let exteriorRingCount = 0;
  let ignoredInteriorRingCount = 0;

  for (const region of regions) {
    if (!region.geometry) {
      continue;
    }

    const multiPolygon = normalizeAuditMultiPolygon(region.geometry);
    const sourcePolygonCount = multiPolygon.length;
    polygonCount += sourcePolygonCount;

    for (const [polygonIndex, polygon] of multiPolygon.entries()) {
      const exteriorRing = polygon[0];
      if (!exteriorRing) {
        continue;
      }

      exteriorRingCount += 1;
      ignoredInteriorRingCount += Math.max(0, polygon.length - 1);
      const ringSegments = extractRingSegments({
        ring: exteriorRing,
        region,
        level,
        tolerance,
        polygonIndex,
        ringIndex: 0,
        sourcePolygonCount,
      });
      segments.push(...ringSegments);
    }
  }

  return {
    segments,
    polygonCount,
    exteriorRingCount,
    ignoredInteriorRingCount,
  };
}

export function auditAdminTopologyLevel(input: {
  level: AdminTopologyAuditLevel;
  regions: NormalizedAdminRegion[];
  tolerance?: number;
}): AdminTopologyLevelSummary {
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCE;
  const regionsWithGeometry = input.regions.filter((region) => region.geometry).length;
  const extracted = extractAdminTopologySegments(input.regions, input.level, tolerance);
  const exactGroups = groupSegmentsByKey(extracted.segments, "canonicalKey");
  const snappedGroups = groupSegmentsByKey(extracted.segments, "snappedKey");
  const nearGroups = groupSegmentsByKey(extracted.segments, "nearKey");
  const exactSharedSegmentCount = countSegmentsInSharedGroups(exactGroups);
  const nearDuplicateGroups = Array.from(snappedGroups.values()).filter((group) =>
    new Set(group.map((segment) => segment.canonicalKey)).size > 1);
  const nearDuplicateSegmentCount = nearDuplicateGroups.reduce(
    (count, group) => count + group.length,
    0,
  );
  const nearCandidateKeys = new Set(
    nearDuplicateGroups.flatMap((group) => group.map((segment) => segment.canonicalKey)),
  );
  const unmatchedSegments = extracted.segments.filter((segment) =>
    (exactGroups.get(segment.canonicalKey)?.length ?? 0) === 1);
  const datasetBbox = computeDatasetBbox(extracted.segments);
  const unmatchedClassifications = unmatchedSegments.map((segment) =>
    classifyUnmatchedSegment({
      segment,
      datasetBbox,
      hasNearDuplicate: nearCandidateKeys.has(segment.canonicalKey) ||
        hasNearDuplicateInNearGroups(segment, nearGroups),
      tolerance,
    }));

  return {
    level: input.level,
    regionCount: input.regions.length,
    regionsWithGeometry,
    polygonCount: extracted.polygonCount,
    exteriorRingCount: extracted.exteriorRingCount,
    ignoredInteriorRingCount: extracted.ignoredInteriorRingCount,
    rawSegmentCount: extracted.segments.length,
    uniqueSegmentCount: exactGroups.size,
    exactSharedSegmentCount,
    exactSharedRatio: ratio(exactSharedSegmentCount, extracted.segments.length),
    nearDuplicateSegmentCount,
    nearDuplicateRatio: ratio(nearDuplicateSegmentCount, extracted.segments.length),
    unmatchedSegmentCount: unmatchedSegments.length,
    likelyOuterBoundary: unmatchedClassifications.filter((item) => item === "likelyOuterBoundary").length,
    likelyMissingNeighbor: unmatchedClassifications.filter((item) => item === "likelyMissingNeighbor").length,
    likelyIslandOrCoast: unmatchedClassifications.filter((item) => item === "likelyIslandOrCoast").length,
    unknownUnmatched: unmatchedClassifications.filter((item) => item === "unknownUnmatched").length,
    tolerance,
    nearDuplicatePairsSample: buildNearDuplicateSamples(nearDuplicateGroups, 8),
    unmatchedSamples: unmatchedSegments.slice(0, 8).map((segment, index) => ({
      segment: toSegmentSample(segment),
      classification: unmatchedClassifications[index] ?? "unknownUnmatched",
    })),
  };
}

export function auditAdminTopology(input: AdminTopologyAuditInput): AdminTopologyAuditResult {
  const level = input.level ?? "all";
  const sample = input.sample ?? "focus";
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCE;
  const provinceRegions = filterRegionsForSample(
    input.provinceRegions ?? [],
    "province",
    sample,
  );
  const prefectureRegions = filterRegionsForSample(
    input.prefectureRegions ?? [],
    "prefecture",
    sample,
  );
  const countyRegions = filterRegionsForSample(
    input.countyRegions ?? [],
    "county",
    sample,
  );
  const summaries: AdminTopologyLevelSummary[] = [];

  if (level === "all" || level === "province") {
    summaries.push(auditAdminTopologyLevel({
      level: "province",
      regions: provinceRegions,
      tolerance,
    }));
  }

  if (level === "all" || level === "prefecture") {
    summaries.push(auditAdminTopologyLevel({
      level: "prefecture",
      regions: prefectureRegions,
      tolerance,
    }));
  }

  if (level === "all" || level === "county") {
    summaries.push(auditAdminTopologyLevel({
      level: "county",
      regions: countyRegions,
      tolerance,
    }));
  }

  return {
    generatedAt: new Date().toISOString(),
    inputFiles: getDefaultAdminTopologyInputFiles(),
    level,
    sample,
    tolerance,
    summaries,
    focusPairs: buildFocusPairSummaries({
      provinceRegions,
      prefectureRegions,
      tolerance,
      sample,
    }),
    parentChildMismatches: buildParentChildMismatchSummaries({
      provinceRegions,
      prefectureRegions,
      countyRegions,
      tolerance,
      sample,
    }),
    rootCauseJudgement: [
      "当前 normalized 行政区是独立 MultiPolygon 面数据，不包含 shared-edge / shared-arc 拓扑身份。",
      "完全重合的相邻边可以通过 canonical key 审计出来，但 near duplicate、分段不一致、父子级叠加仍需要离线预拓扑化处理。",
      "前端 runtime snap 只能做视觉缓解，不适合继续承担全国 county 级 shared-edge 合并与跨 zoom 一致性。",
    ],
  };
}

export function formatAdminTopologyAuditMarkdown(result: AdminTopologyAuditResult) {
  const lines: string[] = [];
  lines.push("# Wanderly V2 Admin Topology Audit");
  lines.push("");
  lines.push(`Generated at: ${result.generatedAt}`);
  lines.push(`Level: ${result.level}`);
  lines.push(`Sample: ${result.sample}`);
  lines.push(`Tolerance: ${result.tolerance}`);
  lines.push("");
  lines.push("## 审计目的");
  lines.push("");
  lines.push("量化当前 normalized 行政区 GeoJSON 在 province / prefecture / county 三个层级上的 shared edge、near duplicate、unmatched boundary 和父子级边界一致性问题，为 Phase F.3 离线 shared-edge preprocessing 与后续 MVT / PMTiles 做输入。");
  lines.push("");
  lines.push("## 输入文件");
  lines.push("");
  for (const [level, file] of Object.entries(result.inputFiles)) {
    lines.push(`- ${level}: \`${file}\``);
  }
  lines.push("");
  lines.push("## 审计方法");
  lines.push("");
  lines.push("- 从 MultiPolygon 每个 polygon 的 exterior ring 提取 segment。");
  lines.push("- 不把 MultiPolygon 多个 exterior ring flatten 成一条线。");
  lines.push("- interior ring / hole 暂不纳入主边界审计，只统计 ignoredInteriorRingCount。");
  lines.push("- exact shared edge 使用 canonical segment key，A-B 与 B-A 视为同一条边。");
  lines.push("- near duplicate 使用 tolerance quantized key，只做审计，不修改数据。");
  lines.push("- unmatched boundary 使用保守分类：likelyOuterBoundary、likelyMissingNeighbor、likelyIslandOrCoast、unknownUnmatched。");
  lines.push("");
  lines.push("## 各层级统计表");
  lines.push("");
  lines.push("| level | regions | polygons | exterior rings | ignored holes | raw segments | unique segments | exact shared | exact ratio | near duplicate | near ratio | unmatched | outer | missing neighbor | island/coast | unknown |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const summary of result.summaries) {
    lines.push([
      `| ${summary.level}`,
      summary.regionCount,
      summary.polygonCount,
      summary.exteriorRingCount,
      summary.ignoredInteriorRingCount,
      summary.rawSegmentCount,
      summary.uniqueSegmentCount,
      summary.exactSharedSegmentCount,
      formatRatio(summary.exactSharedRatio),
      summary.nearDuplicateSegmentCount,
      formatRatio(summary.nearDuplicateRatio),
      summary.unmatchedSegmentCount,
      summary.likelyOuterBoundary,
      summary.likelyMissingNeighbor,
      summary.likelyIslandOrCoast,
      `${summary.unknownUnmatched} |`,
    ].join(" | "));
  }
  lines.push("");
  lines.push("## 重点区域统计");
  lines.push("");
  lines.push("| pair | level | A segments | B segments | exact shared | near duplicate | samples |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const pair of result.focusPairs) {
    lines.push(`| ${pair.label} | ${pair.level} | ${pair.rawSegmentsA} | ${pair.rawSegmentsB} | ${pair.exactSharedSegments} | ${pair.nearDuplicateSegments} | ${pair.unmatchedNearDuplicateSamples.length} |`);
  }
  lines.push("");
  lines.push("## 父子级 mismatch 初审");
  lines.push("");
  lines.push("| area | parent -> child | child count | parent segments | child segments | exact matched | exact coverage | near matched | near coverage |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const item of result.parentChildMismatches) {
    lines.push(`| ${item.label} | ${item.parentLevel} -> ${item.childLevel} | ${item.childCount} | ${item.parentRawSegments} | ${item.childRawSegments} | ${item.exactMatchedParentSegments} | ${formatRatio(item.exactCoverageRatio)} | ${item.nearMatchedParentSegments} | ${formatRatio(item.nearCoverageRatio)} |`);
  }
  lines.push("");
  lines.push("## 当前根因判断");
  lines.push("");
  for (const judgement of result.rootCauseJudgement) {
    lines.push(`- ${judgement}`);
  }
  lines.push("");
  lines.push("## Phase F.3 shared-edge preprocessing 建议");
  lines.push("");
  lines.push("1. 先基于 normalized polygon 生成同级 segment inventory。");
  lines.push("2. 对同级 segment 做 controlled snap、noding、canonical shared-edge id。");
  lines.push("3. 产出 province_boundary_lines / prefecture_boundary_lines / county_boundary_lines。");
  lines.push("4. 对 parent boundary 与 child dissolve 做 mismatch 报告，不在前端 runtime 修。");
  lines.push("5. 再进入 MVT / PMTiles 切片，避免把双线问题固化进 tile。");
  lines.push("");
  lines.push("## 不应继续在前端 runtime 修的问题");
  lines.push("");
  lines.push("- 全国 county 级 shared-edge 拓扑化。");
  lines.push("- 跨 zoom 简化后仍保持 shared edge 一致。");
  lines.push("- 父子级 dissolve 与原始父级 boundary 的系统 reconciliation。");
  lines.push("- 跨 tile 边缘一致性。");
  lines.push("- 大范围 pan / zoom 的根本性能问题。");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function normalizeAuditMultiPolygon(
  geometry: NormalizedMultiPolygonGeometry,
): GeoJsonMultiPolygonCoordinates {
  return geometry.coordinates;
}

function extractRingSegments(input: {
  ring: GeoJsonLinearRing;
  region: NormalizedAdminRegion;
  level: AdminTopologyAuditLevel;
  tolerance: number;
  polygonIndex: number;
  ringIndex: number;
  sourcePolygonCount: number;
}) {
  const points = input.ring
    .map(toAuditPoint)
    .filter((point): point is AdminTopologyPoint => Boolean(point));

  if (points.length < 3) {
    return [];
  }

  const lastIndex = points.length - 1;
  const isClosed = samePoint(points[0]!, points[lastIndex]!);
  const segmentCount = isClosed ? lastIndex : points.length;
  const segments: AdminTopologySegment[] = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const start = points[index]!;
    const end = points[(index + 1) % points.length]!;

    if (samePoint(start, end)) {
      continue;
    }

    const canonicalKey = getSegmentKey(start, end, 8, 0);
    const snappedKey = getSegmentKey(start, end, 6, input.tolerance);
    const nearKey = getSegmentKey(start, end, 6, input.tolerance * 2);
    const bbox = segmentBbox(start, end);

    segments.push({
      id: `${input.level}:${input.region.adcode}:${input.polygonIndex}:${input.ringIndex}:${index}`,
      level: input.level,
      adcode: input.region.adcode,
      name: input.region.name,
      parentAdcode: input.region.parentAdcode,
      provinceAdcode: input.region.provinceAdcode,
      prefectureAdcode: input.region.prefectureAdcode,
      start,
      end,
      canonicalKey,
      snappedKey,
      nearKey,
      bbox,
      lengthApprox: distanceApprox(start, end),
      polygonIndex: input.polygonIndex,
      ringIndex: input.ringIndex,
      ringRole: "exterior",
      sourcePolygonCount: input.sourcePolygonCount,
    });
  }

  return segments;
}

function toAuditPoint(position: unknown): AdminTopologyPoint | null {
  if (!Array.isArray(position)) {
    return null;
  }

  const [lng, lat] = position;
  if (typeof lng !== "number" || typeof lat !== "number") {
    return null;
  }

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return { lng, lat };
}

function samePoint(left: AdminTopologyPoint, right: AdminTopologyPoint) {
  return left.lng === right.lng && left.lat === right.lat;
}

function getSegmentKey(
  start: AdminTopologyPoint,
  end: AdminTopologyPoint,
  precision: number,
  tolerance: number,
) {
  const snappedStart = snapPoint(start, tolerance);
  const snappedEnd = snapPoint(end, tolerance);
  const left = `${snappedStart.lng.toFixed(precision)},${snappedStart.lat.toFixed(precision)}`;
  const right = `${snappedEnd.lng.toFixed(precision)},${snappedEnd.lat.toFixed(precision)}`;

  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function snapPoint(point: AdminTopologyPoint, tolerance: number): AdminTopologyPoint {
  if (tolerance <= 0) {
    return point;
  }

  return {
    lng: Math.round(point.lng / tolerance) * tolerance,
    lat: Math.round(point.lat / tolerance) * tolerance,
  };
}

function segmentBbox(start: AdminTopologyPoint, end: AdminTopologyPoint): AdminRegionBbox {
  return [
    Math.min(start.lng, end.lng),
    Math.min(start.lat, end.lat),
    Math.max(start.lng, end.lng),
    Math.max(start.lat, end.lat),
  ];
}

function distanceApprox(start: AdminTopologyPoint, end: AdminTopologyPoint) {
  const deltaLng = end.lng - start.lng;
  const deltaLat = end.lat - start.lat;

  return Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
}

function groupSegmentsByKey(
  segments: AdminTopologySegment[],
  key: "canonicalKey" | "snappedKey" | "nearKey",
) {
  const groups = new Map<string, AdminTopologySegment[]>();

  for (const segment of segments) {
    const group = groups.get(segment[key]) ?? [];
    group.push(segment);
    groups.set(segment[key], group);
  }

  return groups;
}

function countSegmentsInSharedGroups(groups: Map<string, AdminTopologySegment[]>) {
  let count = 0;

  for (const group of groups.values()) {
    if (group.length > 1) {
      count += group.length;
    }
  }

  return count;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function computeDatasetBbox(segments: AdminTopologySegment[]): AdminRegionBbox | null {
  if (segments.length === 0) {
    return null;
  }

  return segments.reduce<AdminRegionBbox>(
    (bbox, segment) => [
      Math.min(bbox[0], segment.bbox[0]),
      Math.min(bbox[1], segment.bbox[1]),
      Math.max(bbox[2], segment.bbox[2]),
      Math.max(bbox[3], segment.bbox[3]),
    ],
    [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  );
}

function hasNearDuplicateInNearGroups(
  segment: AdminTopologySegment,
  nearGroups: Map<string, AdminTopologySegment[]>,
) {
  const group = nearGroups.get(segment.nearKey) ?? [];
  return new Set(group.map((item) => item.canonicalKey)).size > 1;
}

function classifyUnmatchedSegment(input: {
  segment: AdminTopologySegment;
  datasetBbox: AdminRegionBbox | null;
  hasNearDuplicate: boolean;
  tolerance: number;
}): AdminUnmatchedClassification {
  if (input.hasNearDuplicate) {
    return "likelyMissingNeighbor";
  }

  if (input.segment.sourcePolygonCount > 1) {
    return "likelyIslandOrCoast";
  }

  if (input.datasetBbox && touchesBboxEdge(input.segment.bbox, input.datasetBbox, input.tolerance * 2)) {
    return "likelyOuterBoundary";
  }

  if (input.segment.level === "province") {
    return "likelyOuterBoundary";
  }

  return "unknownUnmatched";
}

function touchesBboxEdge(
  segmentBboxValue: AdminRegionBbox,
  datasetBbox: AdminRegionBbox,
  tolerance: number,
) {
  return (
    Math.abs(segmentBboxValue[0] - datasetBbox[0]) <= tolerance ||
    Math.abs(segmentBboxValue[1] - datasetBbox[1]) <= tolerance ||
    Math.abs(segmentBboxValue[2] - datasetBbox[2]) <= tolerance ||
    Math.abs(segmentBboxValue[3] - datasetBbox[3]) <= tolerance
  );
}

function buildNearDuplicateSamples(
  groups: AdminTopologySegment[][],
  limit: number,
): AdminNearDuplicateSample[] {
  const samples: AdminNearDuplicateSample[] = [];

  for (const group of groups) {
    const byExact = new Map<string, AdminTopologySegment>();
    for (const segment of group) {
      if (!byExact.has(segment.canonicalKey)) {
        byExact.set(segment.canonicalKey, segment);
      }
    }
    const pair = Array.from(byExact.values()).slice(0, 2);
    if (pair.length < 2) {
      continue;
    }
    samples.push({
      snappedKey: pair[0]!.snappedKey,
      segmentA: toSegmentSample(pair[0]!),
      segmentB: toSegmentSample(pair[1]!),
      distanceApprox: segmentDistanceApprox(pair[0]!, pair[1]!),
    });
    if (samples.length >= limit) {
      break;
    }
  }

  return samples;
}

function toSegmentSample(segment: AdminTopologySegment): AdminSegmentSample {
  return {
    level: segment.level,
    adcode: segment.adcode,
    name: segment.name,
    parentAdcode: segment.parentAdcode,
    start: roundPoint(segment.start),
    end: roundPoint(segment.end),
    canonicalKey: segment.canonicalKey,
    bbox: segment.bbox.map((value) => roundNumber(value, 8)) as AdminRegionBbox,
    lengthApprox: roundNumber(segment.lengthApprox, 8),
  };
}

function roundPoint(point: AdminTopologyPoint): AdminTopologyPoint {
  return {
    lng: roundNumber(point.lng, 8),
    lat: roundNumber(point.lat, 8),
  };
}

function roundNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function segmentDistanceApprox(left: AdminTopologySegment, right: AdminTopologySegment) {
  const sameDirection = Math.max(
    distanceApprox(left.start, right.start),
    distanceApprox(left.end, right.end),
  );
  const oppositeDirection = Math.max(
    distanceApprox(left.start, right.end),
    distanceApprox(left.end, right.start),
  );

  return roundNumber(Math.min(sameDirection, oppositeDirection), 8);
}

function filterRegionsForSample(
  regions: NormalizedAdminRegion[],
  level: AdminTopologyAuditLevel,
  sample: AdminTopologySample,
) {
  if (sample === "national") {
    return regions;
  }

  if (sample === "focus" && level === "province") {
    const focusProvinces = new Set([GUANGDONG_ADCODE, GUANGXI_ADCODE, HUNAN_ADCODE]);
    return regions.filter((region) => focusProvinces.has(region.adcode));
  }

  if (sample === "guangdong" || sample === "focus") {
    return regions.filter((region) =>
      region.adcode === GUANGDONG_ADCODE ||
      region.provinceAdcode === GUANGDONG_ADCODE ||
      region.parentAdcode === GUANGDONG_ADCODE);
  }

  if (sample === "coastal") {
    const coastalProvinces = new Set([
      "110000",
      "120000",
      "130000",
      "210000",
      "310000",
      "320000",
      "330000",
      "350000",
      "370000",
      "440000",
      "450000",
      "460000",
    ]);
    return regions.filter((region) =>
      coastalProvinces.has(region.adcode) ||
      (region.provinceAdcode ? coastalProvinces.has(region.provinceAdcode) : false));
  }

  return level === "province" ? regions : [];
}

function buildFocusPairSummaries(input: {
  provinceRegions: NormalizedAdminRegion[];
  prefectureRegions: NormalizedAdminRegion[];
  tolerance: number;
  sample: AdminTopologySample;
}) {
  const provincePairs = input.sample === "national"
    ? FOCUS_PROVINCE_PAIRS
    : FOCUS_PROVINCE_PAIRS.filter(([left, right]) =>
        [left, right].some((adcode) =>
          adcode === GUANGDONG_ADCODE ||
          adcode === GUANGXI_ADCODE ||
          adcode === HUNAN_ADCODE));
  const prefecturePairs = input.sample === "national" || input.sample === "coastal"
    ? [...FOCUS_PREFECTURE_PAIRS, ...YANGTZE_DELTA_PREFECTURE_PAIRS]
    : FOCUS_PREFECTURE_PAIRS;

  return [
    ...provincePairs.map(([left, right, label]) =>
      buildPairSummary({
        level: "province",
        regions: input.provinceRegions,
        adcodeA: left,
        adcodeB: right,
        label,
        tolerance: input.tolerance,
      })),
    ...prefecturePairs.map(([left, right, label]) =>
      buildPairSummary({
        level: "prefecture",
        regions: input.prefectureRegions,
        adcodeA: left,
        adcodeB: right,
        label,
        tolerance: input.tolerance,
      })),
  ].filter((summary): summary is AdminTopologyPairSummary => Boolean(summary));
}

function buildPairSummary(input: {
  level: AdminTopologyAuditLevel;
  regions: NormalizedAdminRegion[];
  adcodeA: string;
  adcodeB: string;
  label: string;
  tolerance: number;
}): AdminTopologyPairSummary | null {
  const regionA = input.regions.find((region) => region.adcode === input.adcodeA);
  const regionB = input.regions.find((region) => region.adcode === input.adcodeB);

  if (!regionA || !regionB) {
    return null;
  }

  const segmentsA = extractAdminTopologySegments([regionA], input.level, input.tolerance).segments;
  const segmentsB = extractAdminTopologySegments([regionB], input.level, input.tolerance).segments;
  const exactB = new Set(segmentsB.map((segment) => segment.canonicalKey));
  const snappedB = new Map<string, AdminTopologySegment[]>();

  for (const segment of segmentsB) {
    const group = snappedB.get(segment.snappedKey) ?? [];
    group.push(segment);
    snappedB.set(segment.snappedKey, group);
  }

  const exactSharedSegments = segmentsA.filter((segment) =>
    exactB.has(segment.canonicalKey)).length;
  const nearDuplicateGroups = segmentsA
    .map((segment) => ({
      segment,
      candidates: snappedB.get(segment.snappedKey) ?? [],
    }))
    .filter((item) =>
      item.candidates.some((candidate) => candidate.canonicalKey !== item.segment.canonicalKey));

  return {
    label: input.label,
    level: input.level,
    adcodeA: regionA.adcode,
    nameA: regionA.name,
    adcodeB: regionB.adcode,
    nameB: regionB.name,
    rawSegmentsA: segmentsA.length,
    rawSegmentsB: segmentsB.length,
    exactSharedSegments,
    nearDuplicateSegments: nearDuplicateGroups.length,
    unmatchedNearDuplicateSamples: nearDuplicateGroups.slice(0, 6).map((item) => ({
      snappedKey: item.segment.snappedKey,
      segmentA: toSegmentSample(item.segment),
      segmentB: toSegmentSample(item.candidates[0]!),
      distanceApprox: segmentDistanceApprox(item.segment, item.candidates[0]!),
    })),
  };
}

function buildParentChildMismatchSummaries(input: {
  provinceRegions: NormalizedAdminRegion[];
  prefectureRegions: NormalizedAdminRegion[];
  countyRegions: NormalizedAdminRegion[];
  tolerance: number;
  sample: AdminTopologySample;
}) {
  const focusPrefectures = ["440300", "440100", "440600", "441300", "441900"];
  const focusProvinces = input.sample === "national"
    ? [GUANGDONG_ADCODE, GUANGXI_ADCODE, HUNAN_ADCODE, "320000", "330000", "310000"]
    : [GUANGDONG_ADCODE];

  return [
    ...focusPrefectures.map((adcode) =>
      buildParentChildMismatchSummary({
        parentLevel: "prefecture",
        childLevel: "county",
        parentAdcode: adcode,
        parentRegions: input.prefectureRegions,
        childRegions: input.countyRegions.filter((region) =>
          region.parentAdcode === adcode || region.prefectureAdcode === adcode),
        tolerance: input.tolerance,
      })),
    ...focusProvinces.map((adcode) =>
      buildParentChildMismatchSummary({
        parentLevel: "province",
        childLevel: "prefecture",
        parentAdcode: adcode,
        parentRegions: input.provinceRegions,
        childRegions: input.prefectureRegions.filter((region) =>
          region.parentAdcode === adcode || region.provinceAdcode === adcode),
        tolerance: input.tolerance,
      })),
  ].filter((summary): summary is AdminParentChildMismatchSummary => Boolean(summary));
}

function buildParentChildMismatchSummary(input: {
  parentLevel: "province" | "prefecture";
  childLevel: "prefecture" | "county";
  parentAdcode: string;
  parentRegions: NormalizedAdminRegion[];
  childRegions: NormalizedAdminRegion[];
  tolerance: number;
}): AdminParentChildMismatchSummary | null {
  const parent = input.parentRegions.find((region) => region.adcode === input.parentAdcode);
  if (!parent || input.childRegions.length === 0) {
    return null;
  }

  const parentSegments = extractAdminTopologySegments(
    [parent],
    input.parentLevel,
    input.tolerance,
  ).segments;
  const childSegments = extractAdminTopologySegments(
    input.childRegions,
    input.childLevel,
    input.tolerance,
  ).segments;
  const childExact = new Set(childSegments.map((segment) => segment.canonicalKey));
  const childSnapped = new Set(childSegments.map((segment) => segment.snappedKey));
  const exactMatchedParentSegments = parentSegments.filter((segment) =>
    childExact.has(segment.canonicalKey)).length;
  const nearMatchedParentSegments = parentSegments.filter((segment) =>
    childSnapped.has(segment.snappedKey)).length;

  return {
    label: parent.name,
    parentLevel: input.parentLevel,
    childLevel: input.childLevel,
    parentAdcode: parent.adcode,
    parentName: parent.name,
    childCount: input.childRegions.length,
    parentRawSegments: parentSegments.length,
    childRawSegments: childSegments.length,
    exactMatchedParentSegments,
    nearMatchedParentSegments,
    exactCoverageRatio: ratio(exactMatchedParentSegments, parentSegments.length),
    nearCoverageRatio: ratio(nearMatchedParentSegments, parentSegments.length),
  };
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
