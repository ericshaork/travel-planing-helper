import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

type AssetRecord = {
  path: string;
  kind: "file" | "directory";
  extension: string;
  sizeBytes: number;
  mtime: string;
  sha256?: string;
  checksumStatus?: "computed" | "not_core_asset" | "directory_not_hashed" | "missing";
};

type ManifestFile = AssetRecord & {
  role?: string;
};

type ManifestJson = Record<string, unknown>;

const ROOT = process.cwd();
const MANIFEST_DIR = "data/source-manifests";
const INVENTORY_DOC = "docs/WANDERLY_V2_MAP_DATA_ASSET_INVENTORY.md";
const SOURCE_DOC = "docs/WANDERLY_V2_MAP_SOURCE_MANIFESTS.md";

const ADMIN_SOURCE_DIR = "【001】2025年带审图号全国行政区划shp（省、市、县）";
const POI_SOURCE_DIR = "【144】全国旅游景点POI数据（2025年）";
const CURRENT_PMTILES = "public/admin-tiles/china-admin-boundaries-gcj02.pmtiles";
const PMTILES_METADATA = "temp/admin-tile-prototype/china-admin-boundaries-gcj02.metadata.json";

const TARGET_EXTENSIONS = new Set([
  ".atx",
  ".cpg",
  ".dbf",
  ".gdbindexes",
  ".gdbtable",
  ".gdbtablx",
  ".geojson",
  ".json",
  ".mbtiles",
  ".pbf",
  ".pmtiles",
  ".prj",
  ".shp",
  ".shx",
  ".spx",
  ".xlsx",
  ".xls",
  ".zip",
]);

const EXCLUDED_DIR_PARTS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".codex",
  ".claude",
  ".qwen",
  "data/source-manifests",
]);

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

function absolute(path: string): string {
  return resolve(ROOT, path);
}

function relativePath(path: string): string {
  return toPosixPath(relative(ROOT, path));
}

function ensureDir(path: string): void {
  mkdirSync(absolute(path), { recursive: true });
}

function isExcluded(path: string): boolean {
  const rel = relativePath(path);
  for (const part of EXCLUDED_DIR_PARTS) {
    if (rel === part || rel.startsWith(`${part}/`)) {
      return true;
    }
  }
  return false;
}

function extensionForFile(name: string): string {
  const lower = name.toLowerCase();
  for (const ext of [".gdbindexes", ".gdbtable", ".gdbtablx"]) {
    if (lower.endsWith(ext)) {
      return ext;
    }
  }
  return extname(lower);
}

function isCandidateFile(name: string): boolean {
  return TARGET_EXTENSIONS.has(extensionForFile(name));
}

function dirSize(path: string): number {
  let total = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (isExcluded(child)) {
      continue;
    }
    if (entry.isDirectory()) {
      total += dirSize(child);
    } else {
      total += statSync(child).size;
    }
  }
  return total;
}

function scanDir(path: string, assets: AssetRecord[]): void {
  if (!existsSync(path) || isExcluded(path)) {
    return;
  }

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (isExcluded(child)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (entry.name.toLowerCase().endsWith(".gdb")) {
        const stat = statSync(child);
        assets.push({
          path: relativePath(child),
          kind: "directory",
          extension: ".gdb",
          sizeBytes: dirSize(child),
          mtime: stat.mtime.toISOString(),
          checksumStatus: "directory_not_hashed",
        });
      }
      scanDir(child, assets);
      continue;
    }

    if (!isCandidateFile(entry.name)) {
      continue;
    }

    const stat = statSync(child);
    assets.push({
      path: relativePath(child),
      kind: "file",
      extension: extensionForFile(entry.name),
      sizeBytes: stat.size,
      mtime: stat.mtime.toISOString(),
      checksumStatus: "not_core_asset",
    });
  }
}

function rootCandidateDirs(): string[] {
  const dirs = [
    "data",
    "public/admin-tiles",
    "temp/admin-tile-prototype",
  ];

  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (
      /2025|行政区划|全国行政区划|全国景点|景点|POI|poi|【/.test(entry.name)
      && !dirs.includes(entry.name)
    ) {
      dirs.push(entry.name);
    }
  }

  return dirs;
}

async function sha256File(path: string): Promise<string> {
  return await new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolvePromise(hash.digest("hex")));
  });
}

function shouldHash(asset: AssetRecord): boolean {
  if (asset.kind !== "file") {
    return false;
  }
  if (asset.path.startsWith(`${ADMIN_SOURCE_DIR}/`)) {
    return true;
  }
  if (asset.path.startsWith("data/admin/normalized/") && asset.extension === ".json") {
    return true;
  }
  if (asset.path === CURRENT_PMTILES) {
    return true;
  }
  if (asset.path.startsWith(`${POI_SOURCE_DIR}/`)) {
    return true;
  }
  return false;
}

async function withChecksums(assets: AssetRecord[]): Promise<AssetRecord[]> {
  const updated: AssetRecord[] = [];
  for (const asset of assets) {
    if (!shouldHash(asset)) {
      updated.push(asset);
      continue;
    }
    const filePath = absolute(asset.path);
    if (!existsSync(filePath)) {
      updated.push({ ...asset, checksumStatus: "missing" });
      continue;
    }
    updated.push({
      ...asset,
      sha256: await sha256File(filePath),
      checksumStatus: "computed",
    });
  }
  return updated;
}

function readJsonFile(path: string): Record<string, unknown> | null {
  const filePath = absolute(path);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickAssets(assets: AssetRecord[], predicate: (asset: AssetRecord) => boolean, role?: string): ManifestFile[] {
  return assets
    .filter(predicate)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((asset) => ({ ...asset, role }));
}

function pmtilesLayerMetadata(): {
  minzoom: number | null;
  maxzoom: number | null;
  layers: Array<Record<string, unknown>>;
  bounds: string | null;
  generator: string | null;
} {
  const metadata = readJsonFile(PMTILES_METADATA);
  if (!metadata) {
    return {
      minzoom: 3,
      maxzoom: 12,
      layers: [
        { id: "province_boundary", level: "province" },
        { id: "prefecture_boundary", level: "prefecture" },
        { id: "county_boundary", level: "county" },
      ],
      bounds: null,
      generator: null,
    };
  }

  const vectorLayers = Array.isArray(metadata.vector_layers)
    ? metadata.vector_layers as Array<Record<string, unknown>>
    : [];

  return {
    minzoom: Number(metadata.minzoom ?? 3),
    maxzoom: Number(metadata.maxzoom ?? 12),
    layers: vectorLayers.map((layer) => ({
      id: layer.id,
      minzoom: layer.minzoom,
      maxzoom: layer.maxzoom,
      fields: layer.fields,
    })),
    bounds: typeof metadata.antimeridian_adjusted_bounds === "string"
      ? metadata.antimeridian_adjusted_bounds
      : null,
    generator: typeof metadata.generator === "string" ? metadata.generator : null,
  };
}

function buildAdminManifest(assets: AssetRecord[]): ManifestJson {
  const files = pickAssets(
    assets,
    (asset) => asset.path.startsWith(`${ADMIN_SOURCE_DIR}/`),
    "raw_source",
  );
  const normalized = pickAssets(
    assets,
    (asset) => asset.path.startsWith("data/admin/normalized/") && asset.path.endsWith(".geometry.json"),
    "normalized_admin_geometry",
  );

  return {
    datasetId: "admin-cn-2025-reviewed-geojson",
    datasetType: "admin_boundary",
    status: "engineering_candidate",
    productionApproved: false,
    source: {
      provider: "unknown_zhihu_netdisk_share",
      sourceName: "2025 全国行政区划 GeoJSON/SHP",
      sourceUrl: null,
      acquiredBy: "manual_download",
      acquiredAt: null,
      notes: "当前数据来自网友网盘分享，尚未确认原始发布方、授权范围、再分发权限和商用权限。",
    },
    license: {
      licenseName: "unknown",
      commercialUseAllowed: null,
      redistributionAllowed: null,
      publicTileServingAllowed: null,
      attributionRequired: null,
      reviewStatus: "needs_legal_review",
      riskLevel: "high",
    },
    coverage: {
      country: "CN",
      levels: ["province", "prefecture", "county"],
      coordinateSystem: "EPSG:4326_or_unknown_to_confirm",
      geometryTypes: ["Polygon", "MultiPolygon", "LineString"],
      expectedUse: "current_admin_boundary_candidate",
    },
    files,
    derivedAssets: normalized,
    qualityNotes: {
      knownIssues: [
        "县区级边界在小图幅下精度不足",
        "沿海、小岛、河口、水域边界与高德底图存在不贴合",
        "部分边界线存在粗糙或长线段问题",
        "需要与 OSM/Geofabrik、DataV、RESDC 或其他高精度源对照",
      ],
      recommendedNextStep: "Phase G1 行政区高精度数据源对照",
    },
    audit: {
      generatedBy: "scripts/audit-map-data-assets.ts",
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildPmtilesManifest(assets: AssetRecord[]): ManifestJson {
  const pmtiles = pickAssets(
    assets,
    (asset) => asset.path === CURRENT_PMTILES,
    "current_feature_flag_candidate_pmtiles",
  );
  const related = pickAssets(
    assets,
    (asset) =>
      asset.path === "temp/admin-tile-prototype/china-admin-boundaries-gcj02.mbtiles"
      || asset.path === PMTILES_METADATA
      || asset.path === "temp/admin-tile-prototype/china-admin-pmtiles-build-plan-gcj02.json",
    "build_related_asset",
  );
  const metadata = pmtilesLayerMetadata();

  return {
    datasetId: "admin-cn-pmtiles-gcj02-current",
    datasetType: "admin_boundary_pmtiles",
    status: "feature_flag_candidate",
    productionApproved: false,
    currentUse: "feature-flag candidate / local candidate",
    sourceDatasets: ["admin-cn-2025-reviewed-geojson"],
    sourceDataNotes: "Derived from normalized admin geometry generated from the current 2025 admin boundary candidate.",
    files: pmtiles,
    derivedAssets: related,
    tileMetadata: {
      pmtilesSpec: 3,
      tileType: "MVT",
      minzoom: metadata.minzoom,
      maxzoom: metadata.maxzoom,
      bounds: metadata.bounds,
      coordinateSystem: "GCJ-02-preoffset",
      sourceCoordinateSystem: "WGS84",
      layers: metadata.layers.length > 0
        ? metadata.layers
        : [
            { id: "province_boundary", level: "province" },
            { id: "prefecture_boundary", level: "prefecture" },
            { id: "county_boundary", level: "county" },
          ],
      generator: metadata.generator,
    },
    build: {
      scripts: [
        "scripts/prototype-admin-tile-sources.ts",
        "scripts/build-guangdong-admin-pmtiles.ts",
      ],
      commands: [
        "node --experimental-strip-types scripts/prototype-admin-tile-sources.ts --scope=china --display-mode=gcj02 --quality-mode=raw",
        "node --experimental-strip-types scripts/build-guangdong-admin-pmtiles.ts --scope=china --execute --display-mode=gcj02 --quality-mode=raw",
      ],
      inferredFrom: [
        "docs/WANDERLY_V2_ADMIN_CHINA_PMTILES_BUILD_RESULT.md",
        "temp/admin-tile-prototype/china-admin-pmtiles-build-plan-gcj02.json",
      ],
    },
    license: {
      inheritedFrom: "admin-cn-2025-reviewed-geojson",
      reviewStatus: "needs_legal_review",
      riskLevel: "high",
      publicTileServingAllowed: null,
    },
    storageRecommendation: {
      currentLocation: "public/admin-tiles",
      recommendedNextLocation: "OSS/CDN or S3-compatible object storage",
      notes: "不要长期放在前端 public 包里；生产前应迁移到支持 Range request 的对象存储和 CDN，并使用 immutable versioned URL。",
    },
    qualityNotes: {
      knownIssues: [
        "县区级精度不足",
        "沿海/岛屿/河口边界粗糙",
        "部分边界与高德底图不贴合",
      ],
      recommendedNextStep: "Phase G1 行政区高精度数据源对照；Phase G2 OSS/CDN Range request 验收。",
    },
    audit: {
      generatedBy: "scripts/audit-map-data-assets.ts",
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildPoiManifest(assets: AssetRecord[]): ManifestJson {
  const files = pickAssets(
    assets,
    (asset) => asset.path.startsWith(`${POI_SOURCE_DIR}/`),
    "raw_source",
  );

  return {
    datasetId: "poi-cn-attractions-2025",
    datasetType: "poi_attraction",
    status: "raw_candidate",
    productionApproved: false,
    source: {
      provider: "unknown_zhihu_netdisk_share",
      sourceName: "2025 全国景点 POI 数据",
      sourceUrl: null,
      acquiredBy: "manual_download",
      notes: "当前数据来自网友网盘分享，尚未确认原始发布方、授权范围、字段来源、坐标系和商用/缓存权限。",
    },
    license: {
      licenseName: "unknown",
      commercialUseAllowed: null,
      redistributionAllowed: null,
      publicServingAllowed: null,
      reviewStatus: "needs_legal_review",
      riskLevel: "high",
    },
    coverage: {
      country: "CN",
      contentTypes: ["attraction", "scenic_spot"],
      coordinateSystem: "unknown_to_confirm",
      expectedUse: "poi_seed_candidate",
    },
    files,
    qualityNotes: {
      knownIssues: [
        "需要抽样核验坐标系",
        "需要检查重复 POI",
        "需要检查已关闭/无效景点",
        "需要检查字段是否来自受限平台",
        "不能直接作为生产 POI 主库",
      ],
      recommendedNextStep: "POI seed quality smoke，抽样 50-100 条并与高德/Wikidata/官方文旅来源对照",
    },
    audit: {
      generatedBy: "scripts/audit-map-data-assets.ts",
      generatedAt: new Date().toISOString(),
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function tableRow(values: Array<string | number | null | undefined>): string {
  return `| ${values.map((value) => String(value ?? "")).join(" | ")} |`;
}

function inventoryDoc(assets: AssetRecord[]): string {
  const totalSize = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const hashed = assets.filter((asset) => asset.checksumStatus === "computed").length;
  const large = assets.filter((asset) => asset.sizeBytes > 100 * 1024 * 1024);
  const core = assets.filter((asset) =>
    asset.path.startsWith(`${ADMIN_SOURCE_DIR}/`)
    || asset.path.startsWith("data/admin/normalized/")
    || asset.path === CURRENT_PMTILES
    || asset.path.startsWith(`${POI_SOURCE_DIR}/`)
  );

  const lines: string[] = [
    "# Wanderly v2.0 Map Data Asset Inventory",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "Scope: metadata inventory for existing map data candidates. The audit script records path, extension, size, mtime, and selected streaming sha256 checksums. It does not print secrets and does not read non-core large files into logs.",
    "",
    "## Summary",
    "",
    tableRow(["Metric", "Value"]),
    tableRow(["---", "---"]),
    tableRow(["Total candidate assets", assets.length]),
    tableRow(["Total candidate size", `${formatBytes(totalSize)} (${totalSize} bytes)`]),
    tableRow(["Assets with sha256", hashed]),
    tableRow(["Assets over 100 MB", large.length]),
    "",
    "## Core datasets",
    "",
    tableRow(["Dataset", "Manifest", "Production approved", "Risk"]),
    tableRow(["---", "---", "---", "---"]),
    tableRow(["2025 全国行政区划 GeoJSON/SHP", "`data/source-manifests/admin-cn-2025-reviewed-geojson.manifest.json`", "false", "high / license unknown"]),
    tableRow(["当前全国 GCJ-02 PMTiles", "`data/source-manifests/admin-cn-pmtiles-gcj02-current.manifest.json`", "false", "high / inherited source license unknown"]),
    tableRow(["2025 全国景点 POI", "`data/source-manifests/poi-cn-attractions-2025.manifest.json`", "false", "high / license and field source unknown"]),
    "",
    "## Core file inventory",
    "",
    tableRow(["Path", "Kind", "Ext", "Size", "MTime", "SHA256"]),
    tableRow(["---", "---", "---", "---:", "---", "---"]),
    ...core.sort((a, b) => a.path.localeCompare(b.path)).map((asset) =>
      tableRow([
        `\`${asset.path}\``,
        asset.kind,
        asset.extension,
        `${formatBytes(asset.sizeBytes)} (${asset.sizeBytes})`,
        asset.mtime,
        asset.sha256 ? `\`${asset.sha256}\`` : asset.checksumStatus,
      ]),
    ),
    "",
    "## Large local files over 100 MB",
    "",
  ];

  if (large.length === 0) {
    lines.push("No candidate asset over 100 MB was found in the scanned scope.");
  } else {
    lines.push(tableRow(["Path", "Size", "MTime", "Checksum status"]));
    lines.push(tableRow(["---", "---:", "---", "---"]));
    for (const asset of large.sort((a, b) => b.sizeBytes - a.sizeBytes)) {
      lines.push(tableRow([
        `\`${asset.path}\``,
        `${formatBytes(asset.sizeBytes)} (${asset.sizeBytes})`,
        asset.mtime,
        asset.checksumStatus,
      ]));
    }
  }

  lines.push(
    "",
    "## Full candidate inventory",
    "",
    tableRow(["Path", "Kind", "Ext", "Size", "MTime", "Checksum status"]),
    tableRow(["---", "---", "---", "---:", "---", "---"]),
  );

  for (const asset of assets.sort((a, b) => a.path.localeCompare(b.path))) {
    lines.push(tableRow([
      `\`${asset.path}\``,
      asset.kind,
      asset.extension,
      `${formatBytes(asset.sizeBytes)} (${asset.sizeBytes})`,
      asset.mtime,
      asset.checksumStatus,
    ]));
  }

  lines.push(
    "",
    "## Notes",
    "",
    "- 当前行政区和景点 POI 数据均继续标记为 `productionApproved=false`。",
    "- 授权未知的数据只能作为工程候选或 raw candidate；不能写成可商用。",
    "- `temp/admin-tile-prototype/china-gcj02-source/china-county-boundary-source.geojson` 超过 100 MB，本轮只记录元数据，不计算 checksum。",
    "- 当前 PMTiles 仍是本地 feature-flag candidate；生产前建议迁移到 OSS/CDN 或 S3-compatible object storage。",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function sourceManifestsDoc(): string {
  return `# Wanderly v2.0 Map Source Manifests

Audit date: 2026-10-11

## 1. Why source manifests exist

Source manifest 是 Wanderly 地图数据的身份证。它记录一个数据集从哪里来、谁提供、是否允许商用和再分发、坐标系是什么、覆盖哪些层级、哪些文件参与了构建、checksum 是多少，以及是否允许进入生产图层。

没有 manifest 的数据不能进入生产地图图层。授权未知的数据只能作为工程候选，不能写成生产可信数据。

## 2. Current data risks

### 2025 行政区数据

- 来源为网友网盘分享，当前 manifest 标记为 \`unknown_zhihu_netdisk_share\`。
- 原始发布方、授权范围、再分发权限、商用权限和公开瓦片服务权限均未确认。
- 当前可用于工程验证和 Map Studio 候选 PMTiles 评估，但不能直接视为最终主数据源。
- 县区级边界、沿海/岛屿/河口/水域边界与高德底图仍存在精度和口径差异。

### 2025 景点 POI

- 来源为网友网盘分享，授权未知。
- 字段来源、坐标系、商用权限、缓存权限和是否含受限平台数据均未确认。
- 当前可作为 POI seed candidate，但不应直接全国上线。
- 需要抽样验证坐标、字段、重复、已关闭/无效景点和授权链路。

## 3. 行政区数据当前判断

- 可以继续作为工程候选源。
- 不建议直接封为最终主数据源。
- 必须进入 Phase G1 高精度数据源对照。
- 当前 derived PMTiles 继续保持 \`productionApproved=false\`。

Phase G1 应重点对比：

- 当前 2025 行政区源数据。
- 当前全国 GCJ-02 PMTiles。
- OSM/Geofabrik 或 OSM-Boundaries 局部样本。
- DataV/GeoAtlas 小样本。
- RESDC / 资源环境科学数据平台或其他官方/商业测绘源。

## 4. 景点 POI 当前判断

- 可以作为 POI seed candidate。
- 不应直接全国上线。
- 不应在授权未知时进入生产 POI 主库。
- 高德、Google Places 等 provider 只适合运行时查询、短 TTL cache 或对照核验，不能未经授权抽取成长期自有库。

下一步建议做 POI seed quality smoke：抽样 50-100 条，与高德、Wikidata、Wikipedia、官方文旅来源交叉核对坐标、名称、分类、重复和来源字段。

## 5. Data admission rules

1. 没有 manifest 的数据不能进入生产图层。
2. 授权 \`unknown\` 的数据只能标记为 \`engineering_candidate\` 或 \`raw_candidate\`。
3. public tile serving 需要明确授权，或在 manifest 中写清楚风险并完成审批。
4. provider raw response 不得进入前端包，不得直接进入 AI prompt。
5. 大型 raw、PMTiles、MBTiles、provider snapshots 不长期放 git；后续迁移 OSS/CDN 或 S3-compatible object storage。
6. Supabase 保存结构化 identity、facts、snapshot metadata 和 object pointer；不保存大型 PMTiles 或 raw geodata。
7. 天气、交通、活动必须带 \`fetched_at\` / \`expires_at\`，不能混进静态 POI 事实。

## 6. Phase G1 inputs

- \`data/source-manifests/admin-cn-2025-reviewed-geojson.manifest.json\`
- \`data/source-manifests/admin-cn-pmtiles-gcj02-current.manifest.json\`
- \`public/admin-tiles/china-admin-boundaries-gcj02.pmtiles\`
- 当前 2025 行政区源数据目录：\`${ADMIN_SOURCE_DIR}/\`
- 待对比源：OSM/Geofabrik、DataV/GeoAtlas、RESDC、官方/商业测绘源。

## 7. Phase G1 sample areas

- 珠三角：广州、深圳、东莞、佛山、珠海、港澳周边。
- 长三角：上海、苏州、杭州湾、宁波。
- 京津冀：北京、天津、河北交界。
- 川渝：成都、重庆和周边区县。
- 东北：黑龙江、吉林、辽宁边界与城市级区县。
- 西北：新疆、西藏、青海、甘肃大范围边界。
- 福建和广东沿海：厦门、汕头、湛江、河口/海岛。
- 港澳台周边：深圳湾、珠海澳门、台湾海峡口径差异。

## 8. Generated files

- \`data/source-manifests/admin-cn-2025-reviewed-geojson.manifest.json\`
- \`data/source-manifests/admin-cn-pmtiles-gcj02-current.manifest.json\`
- \`data/source-manifests/poi-cn-attractions-2025.manifest.json\`
- \`docs/WANDERLY_V2_MAP_DATA_ASSET_INVENTORY.md\`

Refresh command:

\`\`\`bash
node --experimental-strip-types scripts/audit-map-data-assets.ts
\`\`\`
`;
}

async function main(): Promise<void> {
  ensureDir(MANIFEST_DIR);
  ensureDir(dirname(INVENTORY_DOC));

  const assets: AssetRecord[] = [];
  for (const dir of rootCandidateDirs()) {
    scanDir(absolute(dir), assets);
  }

  const uniqueAssets = Array.from(
    new Map(assets.map((asset) => [asset.path, asset])).values(),
  );
  const assetsWithChecksums = await withChecksums(uniqueAssets);

  writeFileSync(
    absolute(`${MANIFEST_DIR}/admin-cn-2025-reviewed-geojson.manifest.json`),
    `${JSON.stringify(buildAdminManifest(assetsWithChecksums), null, 2)}\n`,
  );
  writeFileSync(
    absolute(`${MANIFEST_DIR}/admin-cn-pmtiles-gcj02-current.manifest.json`),
    `${JSON.stringify(buildPmtilesManifest(assetsWithChecksums), null, 2)}\n`,
  );
  writeFileSync(
    absolute(`${MANIFEST_DIR}/poi-cn-attractions-2025.manifest.json`),
    `${JSON.stringify(buildPoiManifest(assetsWithChecksums), null, 2)}\n`,
  );
  writeFileSync(absolute(INVENTORY_DOC), inventoryDoc(assetsWithChecksums));
  writeFileSync(absolute(SOURCE_DOC), sourceManifestsDoc());

  const hashed = assetsWithChecksums.filter((asset) => asset.checksumStatus === "computed").length;
  console.log(JSON.stringify({
    ok: true,
    candidateAssets: assetsWithChecksums.length,
    checksumsComputed: hashed,
    manifests: [
      `${MANIFEST_DIR}/admin-cn-2025-reviewed-geojson.manifest.json`,
      `${MANIFEST_DIR}/admin-cn-pmtiles-gcj02-current.manifest.json`,
      `${MANIFEST_DIR}/poi-cn-attractions-2025.manifest.json`,
    ],
    inventory: INVENTORY_DOC,
    sourceManifestDoc: SOURCE_DOC,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

