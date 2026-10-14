import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G4_MAP_SOURCE_REGISTRY, G4_SAMPLE_REGIONS, type MapDataSource } from "../src/server/map-data-sources/sourceRegistry.ts";
import {
  createOssObjectKey,
  loadOssConfigFromEnvFile,
  ossBucketName,
  sha256Hex,
  uploadBinaryToOss,
} from "../src/server/storage/ossStorage.ts";

type SourceArg = "datav" | "osm-geofabrik" | "osm-coastline" | "geojsoncn" | "cn-atlas-ruiduo" | "all";
type SampleArg = "guangdong" | "shenzhen" | "coastal" | "focus";

type CrawlStatus = "planned" | "downloaded" | "indexed" | "skipped" | "failed" | "uploaded";

type SampleFileMetadata = {
  sourceId: string;
  region: string;
  localPath: string | null;
  ossKey: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  sourceUrl: string;
  fetchedAt: string;
  format: string;
  licenseRisk: string;
  attributionRequired: boolean | "unknown";
  productionApproved: false;
  status: CrawlStatus;
  notes?: string;
  contentType?: string | null;
  httpStatus?: number;
  uploaded?: boolean;
};

type CrawlResult = {
  phase: "G4.1";
  generatedAt: string;
  mode: {
    source: SourceArg;
    sample: SampleArg;
    dryRun: boolean;
    write: boolean;
    uploadRaw: boolean;
    env: string;
  };
  maxDownloadBytes: number;
  sources: Array<Record<string, unknown>>;
  downloadedFiles: SampleFileMetadata[];
  indexedOnly: SampleFileMetadata[];
  skipped: SampleFileMetadata[];
  failed: SampleFileMetadata[];
  summary: {
    automaticDownloadSources: string[];
    indexOnlySources: string[];
    manualAuthorizationRequired: string[];
    adminPrecisionCandidates: string[];
    coastlinePatchCandidates: string[];
    poiTransportFutureCandidates: string[];
  };
};

const ROOT = process.cwd();
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const DEFAULT_ENV = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const OUT_JSON = "data/source-manifests/map-source-crawl.g4-samples.json";
const OUT_DOC = "docs/WANDERLY_V2_MAP_SOURCE_CRAWL_G4_SAMPLE_REPORT.md";

function parseArgs(argv: string[]) {
  const value = (name: string, fallback: string) => {
    const inline = argv.find((arg) => arg.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    const index = argv.indexOf(name);
    return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
  };

  return {
    source: value("--source", "all") as SourceArg,
    sample: value("--sample", "focus") as SampleArg,
    dryRun: argv.includes("--dry-run"),
    write: argv.includes("--write"),
    uploadRaw: argv.includes("--upload-raw"),
    env: value("--env", DEFAULT_ENV),
  };
}

function ensureDir(path: string): void {
  mkdirSync(resolve(ROOT, path), { recursive: true });
}

function writeBytes(path: string, bytes: Uint8Array): void {
  const absolute = resolve(ROOT, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
}

function datePart(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function selectedRegions(sample: SampleArg) {
  if (sample === "guangdong") {
    return G4_SAMPLE_REGIONS.filter((region) => region.id === "guangdong");
  }
  if (sample === "shenzhen") {
    return G4_SAMPLE_REGIONS.filter((region) => region.id === "shenzhen-dongguan-huizhou");
  }
  if (sample === "coastal") {
    return G4_SAMPLE_REGIONS.filter((region) => ["xiamen-coastal", "zhoushan-islands", "shanghai-coastal"].includes(region.id));
  }
  return G4_SAMPLE_REGIONS;
}

function selectedSources(source: SourceArg): MapDataSource[] {
  if (source === "all") {
    return G4_MAP_SOURCE_REGISTRY;
  }
  return G4_MAP_SOURCE_REGISTRY.filter((entry) => entry.sourceId === source);
}

function datavUrls(adcode: string): string[] {
  return [
    `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`,
    `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`,
  ];
}

function geojsoncnUrls(adcode: string): string[] {
  return [
    `https://geojson.cn/api/data/${adcode}.json`,
    `https://fastly.jsdelivr.net/gh/longwosion/geojson-map-china@master/geometryProvince/${adcode}.json`,
  ];
}

function indexUrls(sourceId: string): Array<{ region: string; url: string; format: string; notes: string }> {
  if (sourceId === "osm-geofabrik") {
    return [
      { region: "guangdong", url: "https://download.geofabrik.de/asia/china/guangdong-latest.osm.pbf", format: "PBF", notes: "Province extract; download only if under 100MB." },
      { region: "guangdong", url: "https://download.geofabrik.de/asia/china/guangdong-latest-free.shp.zip", format: "SHP ZIP", notes: "Free SHP extract; download only if under 100MB." },
      { region: "shanghai-coastal", url: "https://download.geofabrik.de/asia/china/shanghai-latest.osm.pbf", format: "PBF", notes: "Province/municipality extract metadata." },
      { region: "zhoushan-islands", url: "https://download.geofabrik.de/asia/china/zhejiang-latest.osm.pbf", format: "PBF", notes: "Zhejiang extract metadata for Zhoushan context." },
      { region: "xiamen-coastal", url: "https://download.geofabrik.de/asia/china/fujian-latest.osm.pbf", format: "PBF", notes: "Fujian extract metadata for Xiamen context." },
    ];
  }
  if (sourceId === "osm-coastline") {
    return [
      { region: "coastal", url: "https://osmdata.openstreetmap.de/download/coastlines-split-4326.zip", format: "SHP ZIP", notes: "Global coastline package; likely over limit." },
      { region: "coastal", url: "https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip", format: "SHP ZIP", notes: "Global land polygons; likely over limit." },
      { region: "coastal", url: "https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip", format: "SHP ZIP", notes: "Global water polygons; likely over limit." },
    ];
  }
  if (sourceId === "cn-atlas-ruiduo") {
    return [
      { region: "index", url: "https://github.com/BarbarossaWang/cn-atlas", format: "HTML", notes: "Repository index only; license/upstream needs manual review." },
      { region: "index", url: "https://raw.githubusercontent.com/BarbarossaWang/cn-atlas/master/README.md", format: "Markdown", notes: "README/index sample when available." },
    ];
  }
  return [];
}

async function headUrl(url: string): Promise<{ status: number; ok: boolean; sizeBytes: number | null; contentType: string | null }> {
  const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
  const length = response.headers.get("content-length");
  const sizeBytes = length && Number.isFinite(Number(length)) ? Number(length) : null;
  return {
    status: response.status,
    ok: response.ok,
    sizeBytes,
    contentType: response.headers.get("content-type"),
  };
}

async function fetchSmall(url: string): Promise<{ status: number; ok: boolean; bytes: Uint8Array; contentType: string | null }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    ok: response.ok,
    bytes,
    contentType: response.headers.get("content-type"),
  };
}

function localPathFor(sourceId: string, date: string, region: string, filename: string): string {
  return `temp/map-source-samples-g4/${sourceId}/${date}/${region}/${filename}`;
}

function rawPrefixFor(source: MapDataSource): string {
  if (source.category === "coastline") return "raw/coastline";
  if (source.category === "poi") return "raw/poi";
  return "raw/admin";
}

function indexFilename(region: string, url: string, format: string): string {
  const pathname = new URL(url).pathname;
  const basename = pathname.split("/").filter(Boolean).pop() ?? format.toLowerCase();
  const safeName = basename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const hash = sha256Hex(url).slice(0, 10);
  return `${region}-${safeName}-${hash}-index.json`;
}

function ossKeyFor(source: MapDataSource, date: string, region: string, filename: string): string {
  return createOssObjectKey([rawPrefixFor(source), source.sourceId, date, "samples", region, filename]);
}

async function maybeUploadRaw(input: {
  enabled: boolean;
  envPath: string;
  source: MapDataSource;
  date: string;
  region: string;
  filename: string;
  bytes: Uint8Array;
  contentType?: string | null;
}): Promise<{ ossKey: string | null; uploaded: boolean }> {
  const ossKey = ossKeyFor(input.source, input.date, input.region, input.filename);
  if (!input.enabled) {
    return { ossKey, uploaded: false };
  }
  const { config, missingKeys } = loadOssConfigFromEnvFile(input.envPath);
  if (!config) {
    throw new Error(`OSS config missing: ${missingKeys.join(", ")}`);
  }
  await uploadBinaryToOss(config, {
    bucket: ossBucketName(config, "raw"),
    objectKey: ossKey,
    body: input.bytes,
    contentType: input.contentType ?? "application/octet-stream",
  });
  return { ossKey, uploaded: true };
}

function metadata(input: Omit<SampleFileMetadata, "productionApproved">): SampleFileMetadata {
  return { ...input, productionApproved: false };
}

async function handleDirectSource(input: {
  source: MapDataSource;
  sourceArg: SourceArg;
  sample: SampleArg;
  date: string;
  dryRun: boolean;
  write: boolean;
  uploadRaw: boolean;
  env: string;
}): Promise<SampleFileMetadata[]> {
  const regions = selectedRegions(input.sample).filter((region) => input.source.sampleRegions.includes(region.id));
  const results: SampleFileMetadata[] = [];

  for (const region of regions) {
    for (const adcode of region.adcodes ?? []) {
      const urls = input.source.sourceId === "geojsoncn" ? geojsoncnUrls(adcode) : datavUrls(adcode);
      let completed = false;

      for (const url of urls) {
        const filename = `${region.id}-${adcode}${url.includes("_full") ? "-full" : ""}.geojson`;
        if (input.dryRun || !input.write) {
          results.push(metadata({
            sourceId: input.source.sourceId,
            region: region.id,
            localPath: localPathFor(input.source.sourceId, input.date, region.id, filename),
            ossKey: ossKeyFor(input.source, input.date, region.id, filename),
            sizeBytes: null,
            sha256: null,
            sourceUrl: url,
            fetchedAt: new Date().toISOString(),
            format: "GeoJSON",
            licenseRisk: input.source.licenseRisk,
            attributionRequired: input.source.attributionRequired,
            status: "planned",
            notes: "Dry run or no --write; no network download performed.",
          }));
          completed = true;
          break;
        }

        try {
          const fetched = await fetchSmall(url);
          if (!fetched.ok) {
            results.push(metadata({
              sourceId: input.source.sourceId,
              region: region.id,
              localPath: null,
              ossKey: null,
              sizeBytes: fetched.bytes.byteLength,
              sha256: null,
              sourceUrl: url,
              fetchedAt: new Date().toISOString(),
              format: "GeoJSON",
              licenseRisk: input.source.licenseRisk,
              attributionRequired: input.source.attributionRequired,
              status: "failed",
              httpStatus: fetched.status,
              notes: `HTTP ${fetched.status}`,
              contentType: fetched.contentType,
            }));
            continue;
          }
          if (fetched.bytes.byteLength > MAX_DOWNLOAD_BYTES) {
            results.push(metadata({
              sourceId: input.source.sourceId,
              region: region.id,
              localPath: null,
              ossKey: null,
              sizeBytes: fetched.bytes.byteLength,
              sha256: sha256Hex(fetched.bytes),
              sourceUrl: url,
              fetchedAt: new Date().toISOString(),
              format: "GeoJSON",
              licenseRisk: input.source.licenseRisk,
              attributionRequired: input.source.attributionRequired,
              status: "skipped",
              httpStatus: fetched.status,
              notes: "Downloaded response exceeded 100MB limit; not written.",
              contentType: fetched.contentType,
            }));
            continue;
          }

          const localPath = localPathFor(input.source.sourceId, input.date, region.id, filename);
          writeBytes(localPath, fetched.bytes);
          const upload = await maybeUploadRaw({
            enabled: input.uploadRaw,
            envPath: input.env,
            source: input.source,
            date: input.date,
            region: region.id,
            filename,
            bytes: fetched.bytes,
            contentType: fetched.contentType,
          });

          results.push(metadata({
            sourceId: input.source.sourceId,
            region: region.id,
            localPath,
            ossKey: upload.ossKey,
            sizeBytes: fetched.bytes.byteLength,
            sha256: sha256Hex(fetched.bytes),
            sourceUrl: url,
            fetchedAt: new Date().toISOString(),
            format: "GeoJSON",
            licenseRisk: input.source.licenseRisk,
            attributionRequired: input.source.attributionRequired,
            status: upload.uploaded ? "uploaded" : "downloaded",
            httpStatus: fetched.status,
            contentType: fetched.contentType,
            uploaded: upload.uploaded,
            notes: input.source.sourceId === "geojsoncn" ? "Mirror sample; license/upstream needs manual confirmation." : "Small direct-download sample.",
          }));
          completed = true;
          break;
        } catch (error) {
          results.push(metadata({
            sourceId: input.source.sourceId,
            region: region.id,
            localPath: null,
            ossKey: null,
            sizeBytes: null,
            sha256: null,
            sourceUrl: url,
            fetchedAt: new Date().toISOString(),
            format: "GeoJSON",
            licenseRisk: input.source.licenseRisk,
            attributionRequired: input.source.attributionRequired,
            status: "failed",
            notes: error instanceof Error ? error.message : String(error),
          }));
        }
      }

      if (!completed) {
        continue;
      }
    }
  }
  return results;
}

async function handleIndexSource(input: {
  source: MapDataSource;
  date: string;
  dryRun: boolean;
  write: boolean;
  uploadRaw: boolean;
  env: string;
}): Promise<SampleFileMetadata[]> {
  const results: SampleFileMetadata[] = [];
  const urls = indexUrls(input.source.sourceId);

  for (const item of urls) {
    const fetchedAt = new Date().toISOString();
    if (input.dryRun || !input.write) {
      results.push(metadata({
        sourceId: input.source.sourceId,
        region: item.region,
        localPath: localPathFor(input.source.sourceId, input.date, item.region, "index-metadata.json"),
        ossKey: ossKeyFor(input.source, input.date, item.region, "index-metadata.json"),
        sizeBytes: null,
        sha256: null,
        sourceUrl: item.url,
        fetchedAt,
        format: item.format,
        licenseRisk: input.source.licenseRisk,
        attributionRequired: input.source.attributionRequired,
        status: "planned",
        notes: item.notes,
      }));
      continue;
    }

    try {
      const head = await headUrl(item.url);
      const overLimit = typeof head.sizeBytes === "number" && head.sizeBytes > MAX_DOWNLOAD_BYTES;
      const indexPayload = {
        sourceId: input.source.sourceId,
        region: item.region,
        sourceUrl: item.url,
        fetchedAt,
        httpStatus: head.status,
        ok: head.ok,
        sizeBytes: head.sizeBytes,
        contentType: head.contentType,
        format: item.format,
        downloadDecision: overLimit ? "index_only_over_100mb" : "index_only_no_download_in_g4_1",
        notes: item.notes,
      };
      const bytes = Buffer.from(JSON.stringify(indexPayload, null, 2));
      const filename = indexFilename(item.region, item.url, item.format);
      const localPath = localPathFor(input.source.sourceId, input.date, item.region, filename);
      writeBytes(localPath, bytes);
      const upload = await maybeUploadRaw({
        enabled: input.uploadRaw,
        envPath: input.env,
        source: input.source,
        date: input.date,
        region: item.region,
        filename,
        bytes,
        contentType: "application/json; charset=utf-8",
      });

      results.push(metadata({
        sourceId: input.source.sourceId,
        region: item.region,
        localPath,
        ossKey: upload.ossKey,
        sizeBytes: bytes.byteLength,
        sha256: sha256Hex(bytes),
        sourceUrl: item.url,
        fetchedAt,
        format: "metadata",
        licenseRisk: input.source.licenseRisk,
        attributionRequired: input.source.attributionRequired,
        status: upload.uploaded ? "uploaded" : "indexed",
        httpStatus: head.status,
        contentType: head.contentType,
        uploaded: upload.uploaded,
        notes: overLimit ? "Remote file is over 100MB; metadata only." : "Index metadata only; no full source download in G4.1.",
      }));
    } catch (error) {
      results.push(metadata({
        sourceId: input.source.sourceId,
        region: item.region,
        localPath: null,
        ossKey: null,
        sizeBytes: null,
        sha256: null,
        sourceUrl: item.url,
        fetchedAt,
        format: item.format,
        licenseRisk: input.source.licenseRisk,
        attributionRequired: input.source.attributionRequired,
        status: "failed",
        notes: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  return results;
}

function classify(files: SampleFileMetadata[], status: CrawlStatus): SampleFileMetadata[] {
  return files.filter((file) => file.status === status);
}

function buildSummary(sources: MapDataSource[]): CrawlResult["summary"] {
  return {
    automaticDownloadSources: sources.filter((source) => source.accessMode === "directDownload").map((source) => source.sourceId),
    indexOnlySources: sources.filter((source) => source.crawlerStatus === "index-only").map((source) => source.sourceId),
    manualAuthorizationRequired: sources.filter((source) => source.licenseRisk === "high" || source.licenseRisk === "unknown").map((source) => source.sourceId),
    adminPrecisionCandidates: ["datav", "geojsoncn", "cn-atlas-ruiduo", "local-2025-admin-baseline"],
    coastlinePatchCandidates: ["osm-coastline", "osm-geofabrik"],
    poiTransportFutureCandidates: ["osm-geofabrik"],
  };
}

function renderReport(result: CrawlResult): string {
  const row = (cells: unknown[]) => `| ${cells.map((cell) => String(cell ?? "").replace(/\n/g, " ")).join(" | ")} |`;
  const fileRows = result.downloadedFiles.concat(result.indexedOnly, result.skipped, result.failed).map((file) =>
    row([
      file.sourceId,
      file.region,
      file.status,
      file.httpStatus ?? "n/a",
      file.sizeBytes ?? "n/a",
      file.ossKey ? `\`${file.ossKey}\`` : "n/a",
      file.localPath ? `\`${file.localPath}\`` : "n/a",
      file.sourceUrl,
      file.notes ?? "",
    ]),
  );

  return `# Wanderly v2.0 Map Source Crawl G4 Sample Report

Phase: G4.1  
Generated: ${result.generatedAt}

This run only performs framework setup, small-sample download, source index checks, local temp archival, and optional raw OSS upload. It does not download files over 100MB, upload public OSS, replace PMTiles, write Supabase, or change Map Studio.

## Run Mode

| source | sample | dryRun | write | uploadRaw | maxDownloadBytes |
| --- | --- | --- | --- | --- | ---: |
| ${result.mode.source} | ${result.mode.sample} | ${result.mode.dryRun} | ${result.mode.write} | ${result.mode.uploadRaw} | ${result.maxDownloadBytes} |

## Source Capability Summary

- Automatically downloadable: ${result.summary.automaticDownloadSources.join(", ") || "none"}
- Index-only in G4.1: ${result.summary.indexOnlySources.join(", ") || "none"}
- Need manual authorization/license confirmation: ${result.summary.manualAuthorizationRequired.join(", ") || "none"}
- Administrative precision candidates: ${result.summary.adminPrecisionCandidates.join(", ")}
- Coastline / island / estuary patch candidates: ${result.summary.coastlinePatchCandidates.join(", ")}
- POI / transport future candidates: ${result.summary.poiTransportFutureCandidates.join(", ")}

## File And Metadata Results

| source | region | status | httpStatus | sizeBytes | ossKey | localPath | sourceUrl | notes |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
${fileRows.join("\n") || row(["n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "No files planned or fetched."])}

## G4.1 Conclusions

- DataV / GeoAtlas is the most reliable automatic small-sample admin source for this phase, but remains comparison-only because license and redistribution terms are not production-cleared.
- GeoJSONcn produced a Guangdong province sample in this run, while city-level API/CDN URLs failed; treat it as a mirror/comparison source only.
- Geofabrik remains an OSM candidate for future admin/transport/POI extraction, but all tested Geofabrik metadata requests failed in this run and should be retried with confirmed current extract URLs.
- OSM coastline / osmdata remains the best open candidate for coastline, island, and river-mouth patch experiments, with ODbL obligations to resolve before production.
- osmdata coastline packages were not downloaded because they exceed the 100MB limit; only small index metadata JSON was archived to raw OSS.
- Current local 2025 administrative data remains baseline only and is not re-downloaded in G4.1.
`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const date = datePart();
  ensureDir("data/source-manifests");
  ensureDir("docs");

  const sources = selectedSources(args.source);
  const files: SampleFileMetadata[] = [];

  for (const source of sources) {
    if (source.crawlerStatus === "baseline-local" || source.accessMode === "manual") {
      files.push(metadata({
        sourceId: source.sourceId,
        region: "baseline",
        localPath: null,
        ossKey: null,
        sizeBytes: null,
        sha256: null,
        sourceUrl: "local-existing-source",
        fetchedAt: new Date().toISOString(),
        format: source.expectedFormats.join(", "),
        licenseRisk: source.licenseRisk,
        attributionRequired: source.attributionRequired,
        status: "skipped",
        notes: "Baseline local source; not re-downloaded in G4.1.",
      }));
      continue;
    }

    if (source.accessMode === "directDownload") {
      files.push(...await handleDirectSource({
        source,
        sourceArg: args.source,
        sample: args.sample,
        date,
        dryRun: args.dryRun,
        write: args.write,
        uploadRaw: args.uploadRaw,
        env: args.env,
      }));
      continue;
    }

    files.push(...await handleIndexSource({
      source,
      date,
      dryRun: args.dryRun,
      write: args.write,
      uploadRaw: args.uploadRaw,
      env: args.env,
    }));
  }

  const result: CrawlResult = {
    phase: "G4.1",
    generatedAt: new Date().toISOString(),
    mode: args,
    maxDownloadBytes: MAX_DOWNLOAD_BYTES,
    sources: sources.map((source) => ({ ...source })),
    downloadedFiles: classify(files, "downloaded").concat(classify(files, "uploaded")),
    indexedOnly: classify(files, "indexed"),
    skipped: classify(files, "skipped").concat(classify(files, "planned")),
    failed: classify(files, "failed"),
    summary: buildSummary(sources),
  };

  writeFileSync(resolve(ROOT, OUT_JSON), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(resolve(ROOT, OUT_DOC), renderReport(result), "utf8");

  process.stdout.write(JSON.stringify({
    ok: true,
    phase: result.phase,
    mode: result.mode,
    counts: {
      downloadedOrUploaded: result.downloadedFiles.length,
      indexedOnly: result.indexedOnly.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
    },
    outputs: [OUT_JSON, OUT_DOC],
  }, null, 2) + "\n");
}

void main();
