const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const REPORT_PATH = "docs/WANDERLY_V2_ADMIN_GEOMETRY_AUDIT.md";
const LEVELS = ["province", "prefecture", "county"] as const;
const COASTAL_PREFECTURE_ADCODES = [
  "440300",
  "440400",
  "440500",
  "441300",
  "350200",
  "350500",
  "350100",
  "330200",
  "330900",
  "330300",
] as const;
const COASTAL_SAMPLE_ADCODES = [
  ...COASTAL_PREFECTURE_ADCODES,
  "310000",
  "810000",
  "820000",
] as const;
const COORDINATE_SAMPLE_ADCODES = ["440300", "440100", "350200", "310000", "110000", "810000"] as const;
const KNOWN_GCJ02_CENTERS: Record<string, [number, number]> = {
  "440300": [114.06455, 22.54846],
  "440100": [113.27079, 23.13531],
  "350200": [118.09644, 24.48541],
  "310000": [121.47822, 31.22886],
  "110000": [116.41338, 39.91092],
  "810000": [114.17961, 22.28416],
};

type AdminAuditLevel = typeof LEVELS[number];

interface AuditArgs {
  envPath: string;
  level: AdminAuditLevel | "all";
  sample: "shenzhen" | "guangdong" | "coastal" | "islands" | "all";
  limit: number;
  writeReport: boolean;
}

interface AdminRegionAuditRow {
  adcode: string;
  name: string;
  level: AdminAuditLevel | "country";
  admin_type: string | null;
  parent_adcode: string | null;
  province_adcode: string | null;
  prefecture_adcode: string | null;
  center_lng: number | null;
  center_lat: number | null;
  label_lng: number | null;
  label_lat: number | null;
  bbox_min_lng: number | null;
  bbox_min_lat: number | null;
  bbox_max_lng: number | null;
  bbox_max_lat: number | null;
  boundary: unknown;
  source: string | null;
  source_updated_at: string | null;
}

function parseEnvFile(envPath: string): Record<string, string> {
  const values: Record<string, string> = {};

  if (!existsSync(envPath)) {
    return values;
  }

  const text = readFileSync(envPath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const name = match[1];
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }

  return values;
}

function findDefaultEnvPath() {
  for (const candidate of [".env.local", ".env"]) {
    const envPath = resolve(process.cwd(), candidate);
    if (existsSync(envPath)) return envPath;
  }

  return resolve(process.cwd(), ".env.local");
}

function parseArgs(argv: string[]): AuditArgs {
  const parsed: Record<string, string | boolean> = {};

  for (const item of argv) {
    if (item === "--write-report") {
      parsed.writeReport = true;
      continue;
    }

    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }

  const level = String(parsed.level ?? "all");
  const sample = String(parsed.sample ?? "coastal");
  const limit = Number(parsed.limit ?? 120);

  if (level !== "all" && !LEVELS.includes(level as AdminAuditLevel)) {
    throw new Error("--level 只允许 province|prefecture|county|all。");
  }

  if (!["shenzhen", "guangdong", "coastal", "islands", "all"].includes(sample)) {
    throw new Error("--sample 只允许 shenzhen|guangdong|coastal|islands|all。");
  }

  return {
    envPath: parsed.env ? resolve(process.cwd(), String(parsed.env)) : findDefaultEnvPath(),
    level: level as AuditArgs["level"],
    sample: sample as AuditArgs["sample"],
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 120,
    writeReport: parsed.writeReport === true,
  };
}

function envFileForOutput(envPath: string) {
  const rel = relative(process.cwd(), envPath);
  if (!rel) return ".";
  return rel.startsWith("..") ? envPath : rel;
}

function isTemplateEnvPath(envPath: string) {
  return basename(envPath).toLowerCase() === TEMPLATE_ENV_FILENAME.toLowerCase();
}

function requireSupabaseEnv(env: Record<string, string>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL。");
  if (!serviceRoleKey) throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY。");

  return {
    url,
    serviceRoleKey,
    host: new URL(url).host,
  };
}

function pointFromRow(row: AdminRegionAuditRow, kind: "center" | "labelPoint") {
  const lng = kind === "center" ? row.center_lng : row.label_lng;
  const lat = kind === "center" ? row.center_lat : row.label_lat;
  return typeof lng === "number" && typeof lat === "number" ? { lng, lat } : null;
}

function bboxFromRow(row: AdminRegionAuditRow): [number, number, number, number] | null {
  return (
    typeof row.bbox_min_lng === "number" &&
    typeof row.bbox_min_lat === "number" &&
    typeof row.bbox_max_lng === "number" &&
    typeof row.bbox_max_lat === "number"
  )
    ? [row.bbox_min_lng, row.bbox_min_lat, row.bbox_max_lng, row.bbox_max_lat]
    : null;
}

function normalizeBoundary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const geometry = value as { type?: unknown; coordinates?: unknown };
  return typeof geometry.type === "string"
    ? { type: geometry.type, coordinates: geometry.coordinates }
    : null;
}

async function countByLevel(client: any, level: AdminAuditLevel) {
  const result = await client
    .from("admin_regions")
    .select("adcode", { count: "exact" })
    .eq("level", level)
    .limit(1);

  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

async function fetchRowsByAdcode(client: any, adcodes: readonly string[]) {
  if (adcodes.length === 0) {
    return [];
  }

  const result = await client
    .from("admin_regions")
    .select("adcode,name,level,admin_type,parent_adcode,province_adcode,prefecture_adcode,center_lng,center_lat,label_lng,label_lat,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,boundary,source,source_updated_at")
    .in("adcode", [...new Set(adcodes)])
    .order("adcode", { ascending: true });

  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as AdminRegionAuditRow[];
}

async function fetchSampleRows(client: any, args: AuditArgs) {
  if (args.sample === "shenzhen" && (args.level === "county" || args.level === "all")) {
    const result = await client
      .from("admin_regions")
      .select("adcode,name,level,admin_type,parent_adcode,province_adcode,prefecture_adcode,center_lng,center_lat,label_lng,label_lat,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,boundary,source,source_updated_at")
      .eq("parent_adcode", "440300")
      .eq("level", "county")
      .order("adcode", { ascending: true })
      .limit(args.limit);

    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  }

  if (args.sample === "guangdong" && args.level === "county") {
    const result = await client
      .from("admin_regions")
      .select("adcode,name,level,admin_type,parent_adcode,province_adcode,prefecture_adcode,center_lng,center_lat,label_lng,label_lat,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,boundary,source,source_updated_at")
      .eq("province_adcode", "440000")
      .eq("level", "county")
      .order("adcode", { ascending: true })
      .limit(args.limit);

    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  }

  if (args.sample === "coastal" && args.level === "county") {
    const result = await client
      .from("admin_regions")
      .select("adcode,name,level,admin_type,parent_adcode,province_adcode,prefecture_adcode,center_lng,center_lat,label_lng,label_lat,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,boundary,source,source_updated_at")
      .in("parent_adcode", COASTAL_PREFECTURE_ADCODES)
      .eq("level", "county")
      .order("adcode", { ascending: true })
      .limit(args.limit);

    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  }

  const sampleAdcodes = args.sample === "coastal"
    ? COASTAL_SAMPLE_ADCODES
    : args.sample === "islands"
      ? ["330900", "440400", "460000", "810000", "820000"]
      : args.sample === "guangdong"
        ? ["440000", "440100", "440300", "440400", "440500", "441300"]
        : [...COASTAL_SAMPLE_ADCODES, "110000"];
  const rows = await fetchRowsByAdcode(client, sampleAdcodes);

  return args.level === "all"
    ? rows.slice(0, args.limit)
    : rows.filter((row) => row.level === args.level).slice(0, args.limit);
}

function loadLocalNormalizedRecords() {
  const files = [
    "data/admin/normalized/china-province-admin-regions.geometry.json",
    "data/admin/normalized/china-prefecture-admin-regions.geometry.json",
    "data/admin/normalized/china-county-admin-regions.geometry.json",
  ];
  const records = new Map<string, any>();

  for (const file of files) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) {
      continue;
    }

    const json = JSON.parse(readFileSync(path, "utf8"));
    const rows = Array.isArray(json) ? json : json.regions ?? json.features ?? [];

    for (const row of rows) {
      if (row?.adcode) {
        records.set(String(row.adcode), row);
      }
    }
  }

  return records;
}

function localRecordToComparable(row: any) {
  const rawLabelPoint = row.labelPoint ?? row.label_point ??
    (typeof row.labelLng === "number" && typeof row.labelLat === "number"
      ? [row.labelLng, row.labelLat]
      : null);
  const labelPoint = Array.isArray(rawLabelPoint)
    ? rawLabelPoint
    : rawLabelPoint &&
      typeof rawLabelPoint.lng === "number" &&
      typeof rawLabelPoint.lat === "number"
      ? [rawLabelPoint.lng, rawLabelPoint.lat]
      : null;

  return {
    geometry: row.geometry ?? row.boundaryGeojson ?? row.boundary_geojson ?? null,
    bbox: row.bbox ?? (
      typeof row.bboxMinLng === "number"
        ? [row.bboxMinLng, row.bboxMinLat, row.bboxMaxLng, row.bboxMaxLat]
        : null
    ),
    labelPoint,
  };
}

function markdownTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 admin geometry audit。");
  }

  const env = parseEnvFile(args.envPath);
  const { createClient } = await import("@supabase/supabase-js");
  const {
    analyzeLabelPointQuality,
    compareLocalRemoteGeometry,
    computeGeometryComplexityStats,
    formatBbox,
    formatPoint,
    getCoordinateRangeIssues,
    haversineDistanceMeters,
    wgs84ToGcj02,
  } = await import("../src/server/data-hub/admin/geometryAudit.ts");
  const { url, serviceRoleKey, host } = requireSupabaseEnv(env);
  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const [provinceCount, prefectureCount, countyCount] = await Promise.all([
    countByLevel(client, "province"),
    countByLevel(client, "prefecture"),
    countByLevel(client, "county"),
  ]);
  const [sampleRows, coordinateRows] = await Promise.all([
    fetchSampleRows(client, args),
    fetchRowsByAdcode(client, COORDINATE_SAMPLE_ADCODES),
  ]);
  const missingCoastal = COASTAL_SAMPLE_ADCODES.filter(
    (adcode) => !coordinateRows.some((row) => row.adcode === adcode) &&
      !sampleRows.some((row) => row.adcode === adcode),
  );
  const localRecords = loadLocalNormalizedRecords();
  const localComparisons = sampleRows.slice(0, 25).map((row) => {
    const local = localRecords.get(row.adcode);
    return compareLocalRemoteGeometry({
      adcode: row.adcode,
      local: local ? localRecordToComparable(local) : null,
      remote: {
        geometry: normalizeBoundary(row.boundary),
        bbox: bboxFromRow(row),
        labelPoint: row.label_lng !== null && row.label_lat !== null
          ? [row.label_lng, row.label_lat]
          : null,
      },
    });
  });
  const analyzedRows = sampleRows.map((row) => {
    const geometry = normalizeBoundary(row.boundary);
    const bbox = bboxFromRow(row);
    const center = pointFromRow(row, "center");
    const labelPoint = pointFromRow(row, "labelPoint");
    const geometryStats = computeGeometryComplexityStats(geometry);
    const labelQuality = analyzeLabelPointQuality({ labelPoint, bbox, geometry });
    const rangeIssues = getCoordinateRangeIssues({ center, labelPoint, bbox });

    return {
      row,
      geometry,
      bbox,
      center,
      labelPoint,
      geometryStats,
      labelQuality,
      rangeIssues,
    };
  });
  const coordinateChecks = coordinateRows.map((row) => {
    const storedCenter = pointFromRow(row, "center");
    const converted = storedCenter ? wgs84ToGcj02(storedCenter) : null;
    const known = KNOWN_GCJ02_CENTERS[row.adcode]
      ? { lng: KNOWN_GCJ02_CENTERS[row.adcode]![0], lat: KNOWN_GCJ02_CENTERS[row.adcode]![1] }
      : null;
    const storedToKnown = storedCenter && known ? haversineDistanceMeters(storedCenter, known) : null;
    const convertedToKnown = converted && known ? haversineDistanceMeters(converted, known) : null;
    const convertedDelta = storedCenter && converted ? haversineDistanceMeters(storedCenter, converted) : null;
    const suspectedCoordinateSystem =
      storedToKnown !== null && storedToKnown < 250
        ? "gcj02"
        : convertedToKnown !== null &&
          storedToKnown !== null &&
          convertedToKnown + 100 < storedToKnown
          ? "wgs84_or_cgcs2000"
          : "unknown";

    return {
      adcode: row.adcode,
      name: row.name,
      level: row.level,
      storedCenter,
      convertedGcj02Estimate: converted,
      deltaMetersEstimate: convertedDelta,
      knownGcj02Center: known,
      storedToKnownMeters: storedToKnown,
      convertedToKnownMeters: convertedToKnown,
      suspectedCoordinateSystem,
    };
  });
  const suspectedCounts = coordinateChecks.reduce<Record<string, number>>((counts, check) => {
    counts[check.suspectedCoordinateSystem] = (counts[check.suspectedCoordinateSystem] ?? 0) + 1;
    return counts;
  }, {});
  const labelSummary = analyzedRows.reduce(
    (summary, item) => {
      if (!item.labelQuality.hasLabelPoint) summary.missingLabelPoint += 1;
      if (item.labelQuality.insideBbox === false) summary.labelOutsideBbox += 1;
      if (item.labelQuality.insidePolygon === false) summary.labelOutsidePolygon += 1;
      if (item.labelQuality.insideLargestPolygonBbox === false) summary.suspiciousIslandLabel += 1;
      return summary;
    },
    {
      missingLabelPoint: 0,
      labelOutsideBbox: 0,
      labelOutsidePolygon: 0,
      suspiciousIslandLabel: 0,
    },
  );
  const totalSampledVertices = analyzedRows.reduce(
    (sum, item) => sum + item.geometryStats.vertexCount,
    0,
  );
  const localMismatches = localComparisons.filter(
    (item) =>
      item.vertexCountDelta !== 0 ||
      item.bboxMatches === false ||
      item.labelPointMatches === false,
  );
  const gcjOffsetLikeCount = coordinateChecks.filter((check) =>
    check.deltaMetersEstimate !== null &&
    check.deltaMetersEstimate >= 300 &&
    check.deltaMetersEstimate <= 900,
  ).length;
  const likelySystem =
    (suspectedCounts.wgs84_or_cgcs2000 ?? 0) > 0 ||
    gcjOffsetLikeCount >= Math.max(2, Math.ceil(coordinateChecks.length / 2))
      ? "epsg4326_wgs84_or_cgcs2000"
      : suspectedCounts.gcj02
        ? "gcj02"
        : "unknown";
  const report = [
    "# Wanderly v2.0 Admin Geometry Audit",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Env file: ${envFileForOutput(args.envPath)}`,
    `Supabase host: ${host}`,
    "",
    "## 结论摘要",
    `- 当前 admin_regions.boundary 数据库类型：geometry(MultiPolygon, 4326)。`,
    `- 当前 geometry 疑似坐标系：${likelySystem}`,
    `- 是否需要 GCJ-02 转换：${likelySystem === "epsg4326_wgs84_or_cgcs2000" ? "很可能需要在高德显示链路做 GCJ-02 显示层验证；本轮不改生产数据。" : "暂不确认需要，需结合高德截图复核。"}`,
    `- 主要卡顿原因初判：区县级 feature 数量与 vertex 数量更高；本次样本 ${analyzedRows.length} 条共 ${totalSampledVertices} 个顶点。`,
    `- label 偏移主要原因初判：labelPoint 质量问题 ${labelSummary.labelOutsidePolygon > 0 ? "存在" : "未在样本中明显出现"}；MultiPolygon 岛屿/海域也会使 centroid/label 看起来偏离主城区。`,
    `- 边界不贴合主要原因初判：${likelySystem === "epsg4326_wgs84_or_cgcs2000" ? "坐标系偏移 + " : ""}行政边界源包含海域/岛屿边界，且不等同高德底图海岸线。`,
    "",
    "## 数据规模",
    `- province count: ${provinceCount}`,
    `- prefecture count: ${prefectureCount}`,
    `- county count: ${countyCount}`,
    `- sampled features: ${analyzedRows.length}`,
    `- total sampled vertices: ${totalSampledVertices}`,
    "",
    "## 坐标系检查",
    markdownTable(
      ["adcode", "name", "level", "storedCenter", "gcj02Estimate", "deltaMetersEstimate", "suspectedCoordinateSystem"],
      coordinateChecks.map((check) => [
        check.adcode,
        check.name,
        check.level,
        formatPoint(check.storedCenter),
        formatPoint(check.convertedGcj02Estimate),
        check.deltaMetersEstimate === null ? "null" : Math.round(check.deltaMetersEstimate).toString(),
        check.suspectedCoordinateSystem,
      ]),
    ),
    "",
    "## geometry 复杂度",
    markdownTable(
      ["adcode", "name", "level", "polygonCount", "ringCount", "vertexCount", "bboxSize", "notes"],
      analyzedRows.slice(0, 80).map((item) => [
        item.row.adcode,
        item.row.name,
        item.row.level,
        String(item.geometryStats.polygonCount),
        String(item.geometryStats.ringCount),
        String(item.geometryStats.vertexCount),
        `${(item.geometryStats.bboxWidth ?? 0).toFixed(4)} x ${(item.geometryStats.bboxHeight ?? 0).toFixed(4)}`,
        [
          item.geometryStats.isMultiPolygon ? "MultiPolygon" : "Polygon",
          item.geometryStats.interiorRingCount > 0 ? `holes:${item.geometryStats.interiorRingCount}` : "",
          item.rangeIssues.join(";"),
        ].filter(Boolean).join(" / ") || "-",
      ]),
    ),
    "",
    "## labelPoint 检查",
    `- missingLabelPoint count: ${labelSummary.missingLabelPoint}`,
    `- labelOutsideBbox count: ${labelSummary.labelOutsideBbox}`,
    `- labelOutsidePolygon count: ${labelSummary.labelOutsidePolygon}`,
    `- suspiciousIslandLabel count: ${labelSummary.suspiciousIslandLabel}`,
    "",
    markdownTable(
      ["adcode", "name", "level", "labelPoint", "insideBbox", "insidePolygon", "notes"],
      analyzedRows.slice(0, 80).map((item) => [
        item.row.adcode,
        item.row.name,
        item.row.level,
        formatPoint(item.labelPoint),
        String(item.labelQuality.insideBbox),
        String(item.labelQuality.insidePolygon),
        item.labelQuality.insideLargestPolygonBbox === false ? "outside largest polygon bbox" : "-",
      ]),
    ),
    "",
    "## 沿海/岛屿问题",
    "沿海样本中 MultiPolygon 和多岛屿结构是正常现象。行政区边界可能包含海域管理边界、岛屿外轮廓或审图数据的行政外包络，它们不应被视为高德底图海岸线。因此即便坐标系修正，海岸线完全贴合也不是合理目标。",
    missingCoastal.length > 0 ? `缺失固定样本 adcode：${missingCoastal.join(", ")}` : "固定沿海样本 adcode 均可在本次读取范围或坐标样本中找到。",
    "",
    "## 本地文件 vs Supabase",
    localMismatches.length === 0
      ? "抽样未发现本地 normalized 与 Supabase boundary 的 vertexCount / bbox / labelPoint 明显不一致。"
      : `发现 ${localMismatches.length} 条抽样差异，需逐项复核。`,
    "",
    markdownTable(
      ["adcode", "localVertexCount", "remoteVertexCount", "vertexDelta", "bboxMatches", "labelPointMatches"],
      localComparisons.slice(0, 40).map((item) => [
        item.adcode,
        String(item.localVertexCount),
        String(item.remoteVertexCount),
        String(item.vertexCountDelta),
        String(item.bboxMatches),
        String(item.labelPointMatches),
      ]),
    ),
    "",
    "## 后续建议",
    "- 优先做坐标系显示层验证：用同一批样本在高德底图上比较 raw WGS84/CGCS2000 与 GCJ-02 转换后的贴合度。",
    "- labelPoint 应改为导入期或服务端预计算：对 MultiPolygon 使用最大主 polygon 的 representative point，并保留 visible-label fallback。",
    "- 区县级性能优先做 tile 化或 viewport tile cache，而不是继续实时拉大 bbox。",
    "- 边界去重渲染仍然需要保留，但它解决的是双线/重线，不解决坐标系或数据源海岸线差异。",
    "",
  ].join("\n");

  if (args.writeReport) {
    const reportPath = resolve(process.cwd(), REPORT_PATH);
    mkdirSync(resolve(process.cwd(), "docs"), { recursive: true });
    writeFileSync(reportPath, report, "utf8");
  }

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    host,
    level: args.level,
    sample: args.sample,
    counts: {
      province: provinceCount,
      prefecture: prefectureCount,
      county: countyCount,
    },
    sampledFeatures: analyzedRows.length,
    totalSampledVertices,
    suspectedCoordinateSystems: suspectedCounts,
    labelSummary,
    localRemoteMismatches: localMismatches.length,
    reportPath: args.writeReport ? REPORT_PATH : null,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
