import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type ToolStatus = {
  name: "tippecanoe" | "tile-join" | "pmtiles";
  available: boolean;
  path: string | null;
  runner: "native" | "wsl" | null;
};

type DisplayMode = "wgs84" | "gcj02";
type QualityMode = "raw" | "clean";
type Scope = "guangdong" | "china";

type SourceLayer = {
  name: "province_boundary" | "prefecture_boundary" | "county_boundary";
  path: string;
  featureCount: number;
  sizeBytes: number;
};

type BuildPlan = {
  generatedAt: string;
  dryRun: boolean;
  canBuildPmtiles: boolean;
  tools: ToolStatus[];
  sourceLayers: SourceLayer[];
  output: {
    mbtiles: string;
    pmtiles: string;
  };
  scope: Scope;
  displayMode: DisplayMode;
  qualityMode: QualityMode;
  noSimplification: boolean;
  coordinateSystem: "WGS84" | "GCJ-02-preoffset";
  sourceCoordinateSystem: "WGS84";
  commands: {
    tippecanoe: string[];
    pmtiles: string[];
  };
  notes: string[];
};

const ROOT = process.cwd();
const SOURCE_LAYERS_BY_DISPLAY_MODE: Record<
  DisplayMode,
  Array<Omit<SourceLayer, "featureCount" | "sizeBytes">>
> = {
  wgs84: [
    {
      name: "province_boundary",
      path: "temp/admin-tile-prototype/guangdong-province-boundary-source.geojson",
    },
    {
      name: "prefecture_boundary",
      path: "temp/admin-tile-prototype/guangdong-prefecture-boundary-source.geojson",
    },
    {
      name: "county_boundary",
      path: "temp/admin-tile-prototype/guangdong-county-boundary-source.geojson",
    },
  ],
  gcj02: [
    {
      name: "province_boundary",
      path: "temp/admin-tile-prototype/gcj02-source/guangdong-province-boundary-source.geojson",
    },
    {
      name: "prefecture_boundary",
      path: "temp/admin-tile-prototype/gcj02-source/guangdong-prefecture-boundary-source.geojson",
    },
    {
      name: "county_boundary",
      path: "temp/admin-tile-prototype/gcj02-source/guangdong-county-boundary-source.geojson",
    },
  ],
};
const CLEAN_SOURCE_LAYERS: Array<Omit<SourceLayer, "featureCount" | "sizeBytes">> = [
  {
    name: "province_boundary",
    path: "temp/admin-tile-prototype/clean-source/guangdong-province-boundary-source.geojson",
  },
  {
    name: "prefecture_boundary",
    path: "temp/admin-tile-prototype/clean-source/guangdong-prefecture-boundary-source.geojson",
  },
  {
    name: "county_boundary",
    path: "temp/admin-tile-prototype/clean-source/guangdong-county-boundary-source.geojson",
  },
];
const CHINA_SOURCE_LAYERS_BY_DISPLAY_MODE: Record<
  DisplayMode,
  Array<Omit<SourceLayer, "featureCount" | "sizeBytes">>
> = {
  wgs84: [
    {
      name: "province_boundary",
      path: "temp/admin-tile-prototype/china-source/china-province-boundary-source.geojson",
    },
    {
      name: "prefecture_boundary",
      path: "temp/admin-tile-prototype/china-source/china-prefecture-boundary-source.geojson",
    },
    {
      name: "county_boundary",
      path: "temp/admin-tile-prototype/china-source/china-county-boundary-source.geojson",
    },
  ],
  gcj02: [
    {
      name: "province_boundary",
      path: "temp/admin-tile-prototype/china-gcj02-source/china-province-boundary-source.geojson",
    },
    {
      name: "prefecture_boundary",
      path: "temp/admin-tile-prototype/china-gcj02-source/china-prefecture-boundary-source.geojson",
    },
    {
      name: "county_boundary",
      path: "temp/admin-tile-prototype/china-gcj02-source/china-county-boundary-source.geojson",
    },
  ],
};
const CHINA_CLEAN_SOURCE_LAYERS: Array<Omit<SourceLayer, "featureCount" | "sizeBytes">> = [
  {
    name: "province_boundary",
    path: "temp/admin-tile-prototype/china-clean-source/china-province-boundary-source.geojson",
  },
  {
    name: "prefecture_boundary",
    path: "temp/admin-tile-prototype/china-clean-source/china-prefecture-boundary-source.geojson",
  },
  {
    name: "county_boundary",
    path: "temp/admin-tile-prototype/china-clean-source/china-county-boundary-source.geojson",
  },
];
const OUTPUTS_BY_DISPLAY_MODE: Record<
  DisplayMode,
  { mbtiles: string; pmtiles: string; plan: string }
> = {
  wgs84: {
    mbtiles: "temp/admin-tile-prototype/guangdong-admin-boundaries.mbtiles",
    pmtiles: "public/admin-tiles/guangdong-admin-boundaries.pmtiles",
    plan: "temp/admin-tile-prototype/guangdong-admin-pmtiles-build-plan.json",
  },
  gcj02: {
    mbtiles: "temp/admin-tile-prototype/guangdong-admin-boundaries-gcj02.mbtiles",
    pmtiles: "public/admin-tiles/guangdong-admin-boundaries-gcj02.pmtiles",
    plan: "temp/admin-tile-prototype/guangdong-admin-pmtiles-build-plan-gcj02.json",
  },
};
const GCJ02_NOSIMPLIFY_OUTPUTS = {
  mbtiles: "temp/admin-tile-prototype/guangdong-admin-boundaries-gcj02-nosimplify.mbtiles",
  pmtiles: "public/admin-tiles/guangdong-admin-boundaries-gcj02-nosimplify.pmtiles",
  plan: "temp/admin-tile-prototype/guangdong-admin-pmtiles-build-plan-gcj02-nosimplify.json",
};
const GCJ02_CLEAN_OUTPUTS = {
  mbtiles: "temp/admin-tile-prototype/guangdong-admin-boundaries-gcj02-clean.mbtiles",
  pmtiles: "public/admin-tiles/guangdong-admin-boundaries-gcj02-clean.pmtiles",
  plan: "temp/admin-tile-prototype/guangdong-admin-pmtiles-build-plan-gcj02-clean.json",
};
const CHINA_OUTPUTS_BY_DISPLAY_MODE: Record<
  DisplayMode,
  { mbtiles: string; pmtiles: string; plan: string }
> = {
  wgs84: {
    mbtiles: "temp/admin-tile-prototype/china-admin-boundaries.mbtiles",
    pmtiles: "public/admin-tiles/china-admin-boundaries.pmtiles",
    plan: "temp/admin-tile-prototype/china-admin-pmtiles-build-plan.json",
  },
  gcj02: {
    mbtiles: "temp/admin-tile-prototype/china-admin-boundaries-gcj02.mbtiles",
    pmtiles: "public/admin-tiles/china-admin-boundaries-gcj02.pmtiles",
    plan: "temp/admin-tile-prototype/china-admin-pmtiles-build-plan-gcj02.json",
  },
};
const TILE_METADATA_BY_DISPLAY_MODE: Record<
  DisplayMode,
  { coordinateSystem: "WGS84" | "GCJ-02-preoffset"; description: string }
> = {
  wgs84: {
    coordinateSystem: "WGS84",
    description:
      "Guangdong admin boundaries prototype. Source coordinates are WGS84.",
  },
  gcj02: {
    coordinateSystem: "GCJ-02-preoffset",
    description:
      "Guangdong admin boundaries prototype. Source coordinates are WGS84 and tile coordinates are pre-offset to GCJ-02 for AMap comparison.",
  },
};
const TILE_ATTRIBUTE_INCLUDES = [
  "layer",
  "level",
  "leftAdcode",
  "rightAdcode",
  "parentAdcode",
  "source",
  "topologyVersion",
  "displayMode",
  "coordinateSystem",
  "sourceCoordinateSystem",
  "qualityMode",
  "qualityAction",
  "qualityClassification",
  "qualityReason",
];

function parseArgs(argv: string[]) {
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

  return {
    execute: argv.includes("--execute"),
    scope: parseScope(parsed.scope),
    displayMode: parseDisplayMode(parsed["display-mode"]),
    qualityMode: parseQualityMode(parsed["quality-mode"]),
    noSimplification: parsed["no-simplification"] === true || parsed["no-simplify"] === true,
  };
}

function parseScope(value: string | boolean | undefined): Scope {
  if (typeof value !== "string") {
    return "guangdong";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "guangdong" || normalized === "gd") {
    return "guangdong";
  }

  if (normalized === "china" || normalized === "national") {
    return "china";
  }

  throw new Error(`Unsupported --scope=${value}. Expected guangdong or china.`);
}

function parseDisplayMode(value: string | boolean | undefined): DisplayMode {
  if (typeof value !== "string") {
    return "wgs84";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "gcj02" || normalized === "gcj-02") {
    return "gcj02";
  }

  if (normalized === "wgs84" || normalized === "raw") {
    return "wgs84";
  }

  throw new Error(`Unsupported --display-mode=${value}. Expected wgs84, raw, or gcj02.`);
}

function parseQualityMode(value: string | boolean | undefined): QualityMode {
  if (typeof value !== "string") {
    return "raw";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "raw" || normalized === "default") {
    return "raw";
  }

  if (normalized === "clean") {
    return "clean";
  }

  throw new Error(`Unsupported --quality-mode=${value}. Expected raw or clean.`);
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9_./:@=+-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function commandToText(command: string[]): string {
  return command.map(shellQuote).join(" ");
}

function findTool(name: ToolStatus["name"]): ToolStatus {
  const command = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [name] : ["-v", name];
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform !== "win32",
  });
  const output = result.stdout.trim().split(/\r?\n/).filter(Boolean)[0] ?? null;

  return {
    name,
    available: result.status === 0 && output !== null,
    path: output,
    runner: result.status === 0 && output !== null ? "native" : null,
  };
}

function findToolWithWslFallback(name: ToolStatus["name"]): ToolStatus {
  const nativeTool = findTool(name);

  if (nativeTool.available || process.platform !== "win32") {
    return nativeTool;
  }

  const result = spawnSync("wsl", ["bash", "-lc", `command -v ${name}`], {
    encoding: "utf8",
  });
  const output = result.stdout.trim().split(/\r?\n/).filter(Boolean)[0] ?? null;

  if (result.status === 0 && output) {
    return {
      name,
      available: true,
      path: output,
      runner: "wsl",
    };
  }

  return nativeTool;
}

function getFeatureCount(path: string): number {
  const payload = JSON.parse(readFileSync(resolve(ROOT, path), "utf8")) as {
    features?: unknown[];
  };

  return Array.isArray(payload.features) ? payload.features.length : 0;
}

function getSourceLayerInputs(scope: Scope, displayMode: DisplayMode, qualityMode: QualityMode) {
  if (scope === "china") {
    if (qualityMode === "clean") {
      return CHINA_CLEAN_SOURCE_LAYERS;
    }

    return CHINA_SOURCE_LAYERS_BY_DISPLAY_MODE[displayMode];
  }

  if (qualityMode === "clean") {
    return CLEAN_SOURCE_LAYERS;
  }

  return SOURCE_LAYERS_BY_DISPLAY_MODE[displayMode];
}

function getOutputs(
  scope: Scope,
  displayMode: DisplayMode,
  qualityMode: QualityMode,
  noSimplification: boolean,
) {
  if (scope === "china") {
    if (qualityMode === "clean" || noSimplification) {
      const displaySuffix = displayMode === "gcj02" ? "gcj02" : "wgs84";
      const suffix = [
        displaySuffix,
        qualityMode === "clean" ? "clean" : null,
        noSimplification ? "nosimplify" : null,
      ].filter(Boolean).join("-");

      return {
        mbtiles: `temp/admin-tile-prototype/china-admin-boundaries-${suffix}.mbtiles`,
        pmtiles: `public/admin-tiles/china-admin-boundaries-${suffix}.pmtiles`,
        plan: `temp/admin-tile-prototype/china-admin-pmtiles-build-plan-${suffix}.json`,
      };
    }

    return CHINA_OUTPUTS_BY_DISPLAY_MODE[displayMode];
  }

  if (displayMode === "gcj02" && qualityMode === "clean") {
    return GCJ02_CLEAN_OUTPUTS;
  }

  if (displayMode === "gcj02" && noSimplification) {
    return GCJ02_NOSIMPLIFY_OUTPUTS;
  }

  return OUTPUTS_BY_DISPLAY_MODE[displayMode];
}

function getSourceLayers(
  scope: Scope,
  displayMode: DisplayMode,
  qualityMode: QualityMode,
): SourceLayer[] {
  return getSourceLayerInputs(scope, displayMode, qualityMode).map((layer) => {
    const absolutePath = resolve(ROOT, layer.path);

    if (!existsSync(absolutePath)) {
      throw new Error(
        `Missing source layer: ${layer.path}. Run scripts/prototype-admin-tile-sources.ts --display-mode=${displayMode} --quality-mode=${qualityMode} first.`,
      );
    }

    return {
      ...layer,
      featureCount: getFeatureCount(layer.path),
      sizeBytes: statSync(absolutePath).size,
    };
  });
}

function buildTippecanoeCommand(
  scope: Scope,
  displayMode: DisplayMode,
  qualityMode: QualityMode,
  noSimplification: boolean,
  sourceLayers: Array<Omit<SourceLayer, "featureCount" | "sizeBytes">>,
  outputs: { mbtiles: string },
) {
  const metadata = TILE_METADATA_BY_DISPLAY_MODE[displayMode];
  const nameSuffix = [
    displayMode === "gcj02" ? "gcj02" : "wgs84",
    qualityMode === "clean" ? "clean" : null,
    noSimplification ? "nosimplify" : null,
  ].filter(Boolean).join("-");
  const simplificationArgs = noSimplification
    ? ["--no-line-simplification", "--no-simplification-of-shared-nodes"]
    : [];

  return [
    "tippecanoe",
    "--force",
    "--minimum-zoom=3",
    "--maximum-zoom=12",
    "--no-feature-limit",
    "--no-tile-size-limit",
    "--extend-zooms-if-still-dropping",
    ...simplificationArgs,
    `--name=${scope}-admin-boundaries-${nameSuffix}`,
    `--description=${metadata.description.replace("Guangdong", scope === "china" ? "China" : "Guangdong")} scope=${scope}; qualityMode=${qualityMode}; noSimplification=${noSimplification}.`,
    ...TILE_ATTRIBUTE_INCLUDES.map((attribute) => `--include=${attribute}`),
    "-o",
    outputs.mbtiles,
    "-L",
    `province_boundary:${sourceLayers[0].path}`,
    "-L",
    `prefecture_boundary:${sourceLayers[1].path}`,
    "-L",
    `county_boundary:${sourceLayers[2].path}`,
  ];
}

function buildPmtilesCommand(outputs: { mbtiles: string; pmtiles: string }) {
  return [
    "pmtiles",
    "convert",
    outputs.mbtiles,
    outputs.pmtiles,
  ];
}

function writeJson(path: string, value: unknown) {
  const absolutePath = resolve(ROOT, path);
  const parent = dirname(absolutePath);

  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureParentDirectory(path: string) {
  const absolutePath = resolve(ROOT, path);
  const parent = dirname(absolutePath);

  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
}

function toWslPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/^([a-zA-Z]):\/(.*)$/);

  if (!match) {
    return normalized;
  }

  return `/mnt/${match[1].toLowerCase()}/${match[2]}`;
}

function executeCommand(command: string[], runner: "native" | "wsl") {
  if (runner === "wsl") {
    const wslRoot = toWslPath(ROOT);
    const result = spawnSync(
      "wsl",
      ["bash", "-lc", `cd ${shellQuote(wslRoot)} && ${commandToText(command)}`],
      {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      throw new Error(`Command failed: ${commandToText(command)}`);
    }

    return;
  }

  const [bin, ...args] = command;
  const result = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${commandToText(command)}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceLayers = getSourceLayers(args.scope, args.displayMode, args.qualityMode);
  const sourceLayerInputs = getSourceLayerInputs(args.scope, args.displayMode, args.qualityMode);
  const outputs = getOutputs(args.scope, args.displayMode, args.qualityMode, args.noSimplification);
  const tileMetadata = TILE_METADATA_BY_DISPLAY_MODE[args.displayMode];
  const tools = (["tippecanoe", "tile-join", "pmtiles"] as const).map(findToolWithWslFallback);
  const canBuildPmtiles = tools.some((tool) => tool.name === "tippecanoe" && tool.available) &&
    tools.some((tool) => tool.name === "pmtiles" && tool.available);
  const tippecanoeTool = tools.find((tool) => tool.name === "tippecanoe" && tool.available);
  const pmtilesTool = tools.find((tool) => tool.name === "pmtiles" && tool.available);
  const tippecanoeCommand = buildTippecanoeCommand(
    args.scope,
    args.displayMode,
    args.qualityMode,
    args.noSimplification,
    sourceLayerInputs,
    outputs,
  );
  const pmtilesCommand = buildPmtilesCommand(outputs);
  const plan: BuildPlan = {
    generatedAt: new Date().toISOString(),
    dryRun: !args.execute,
    canBuildPmtiles,
    tools,
    sourceLayers,
    output: {
      mbtiles: outputs.mbtiles,
      pmtiles: outputs.pmtiles,
    },
    scope: args.scope,
    displayMode: args.displayMode,
    qualityMode: args.qualityMode,
    noSimplification: args.noSimplification,
    coordinateSystem: tileMetadata.coordinateSystem,
    sourceCoordinateSystem: "WGS84",
    commands: {
      tippecanoe: tippecanoeCommand,
      pmtiles: pmtilesCommand,
    },
    notes: canBuildPmtiles
      ? [
        "Run with --execute to build MBTiles and PMTiles locally.",
        "tile-join is optional for this single-command Guangdong prototype.",
      ]
      : [
        "tippecanoe and pmtiles CLI are required to build PMTiles.",
        "This dry-run only writes the command plan and validates source layer inputs.",
      ],
  };

  writeJson(outputs.plan, plan);
  console.log(JSON.stringify({
    ...plan,
    commandsText: {
      tippecanoe: commandToText(tippecanoeCommand),
      pmtiles: commandToText(pmtilesCommand),
    },
  }, null, 2));

  if (args.execute) {
    if (!canBuildPmtiles) {
      throw new Error("Cannot execute PMTiles build because tippecanoe or pmtiles CLI is missing.");
    }

    if (!tippecanoeTool?.runner || !pmtilesTool?.runner) {
      throw new Error("Cannot execute PMTiles build because tool runner detection failed.");
    }

    if (tippecanoeTool.runner !== pmtilesTool.runner) {
      throw new Error("Cannot execute PMTiles build because tippecanoe and pmtiles were found in different environments.");
    }

    ensureParentDirectory(outputs.mbtiles);
    ensureParentDirectory(outputs.pmtiles);
    executeCommand(tippecanoeCommand, tippecanoeTool.runner);
    executeCommand(pmtilesCommand, pmtilesTool.runner);
  }
}

main();
