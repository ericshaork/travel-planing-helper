const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const REQUIRED_PREFECTURES = ["440100", "440300", "441900", "442000"] as const;
const REQUIRED_PROVINCES = ["440000", "110000", "310000", "330000", "510000"] as const;
const REQUIRED_SHENZHEN_COUNTIES = ["440305", "440304", "440303", "440308", "440306", "440307", "440309", "440310", "440311"] as const;
const REQUIRED_MULTI_PROVINCE_PREFECTURES = {
  "330000": ["杭州市", "宁波市", "温州市"],
  "510000": ["成都市"],
  "610000": ["西安市"],
  "350000": ["厦门市", "福州市"],
  "320000": ["南京市", "苏州市"],
  "370000": ["济南市", "青岛市"],
} as const;
const REQUIRED_COUNTY_API_CHECKS = {
  "110000": {
    includeGeometry: true,
    requiredNames: ["东城区", "西城区", "朝阳区", "海淀区"],
  },
  "310000": {
    includeGeometry: true,
    requiredNames: ["黄浦区", "徐汇区", "浦东新区"],
  },
  "440300": {
    includeGeometry: true,
    requiredNames: ["罗湖区", "福田区", "南山区", "宝安区", "龙岗区", "盐田区", "龙华区", "坪山区", "光明区"],
  },
  "330100": {
    includeGeometry: true,
    requiredNames: ["上城区", "西湖区", "余杭区", "萧山区"],
  },
  "510100": {
    includeGeometry: false,
    requiredNames: ["锦江区", "武侯区", "青羊区", "成华区"],
  },
} as const;

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

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};
  for (const item of argv) {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }

  return {
    envPath: parsed.env ? resolve(process.cwd(), parsed.env) : findDefaultEnvPath(),
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

function presenceByName(
  features: Array<{ name: string }>,
  names: readonly string[],
) {
  const featureNames = new Set(features.map((feature) => feature.name));
  return Object.fromEntries(names.map((name) => [name, featureNames.has(name)]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 admin boundaries API smoke。");
  }

  const env = parseEnvFile(args.envPath);
  const { url, serviceRoleKey, host } = requireSupabaseEnv(env);
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

  const { createAdminBoundaryService } = await import("../src/server/data-hub/admin/adminBoundaryService.ts");
  const service = createAdminBoundaryService();
  const provinceResult = await service.getAdminBoundaries({
    parentAdcode: "100000",
    level: "province",
    includeGeometry: true,
  });
  const provinceLightResult = await service.getAdminBoundaries({
    parentAdcode: "100000",
    level: "province",
    includeGeometry: false,
  });
  const prefectureResult = await service.getAdminBoundaries({
    parentAdcode: "440000",
    level: "prefecture",
    includeGeometry: true,
  });
  const countyResult = await service.getAdminBoundaries({
    parentAdcode: "440300",
    level: "county",
    includeGeometry: true,
  });
  const multiProvincePrefectureChecks: Record<string, {
    level: string;
    count: number;
    hasGeometryCount: number;
    includeGeometryFalseHasGeometryCount?: number;
    requiredNamesPresent: Record<string, boolean>;
    missingGeometry: number;
  }> = {};
  const countyApiChecks: Record<string, {
    level: string;
    count: number;
    hasGeometryCount: number;
    includeGeometry: boolean;
    requiredNamesPresent: Record<string, boolean>;
    missingGeometry: number;
  }> = {};

  for (const [parentAdcode, requiredNames] of Object.entries(REQUIRED_MULTI_PROVINCE_PREFECTURES)) {
    const result = await service.getAdminBoundaries({
      parentAdcode,
      level: "prefecture",
      includeGeometry: true,
    });
    const hasGeometryCount = result.features.filter((feature: { geometry?: unknown }) => feature.geometry).length;
    const check: {
      level: string;
      count: number;
      hasGeometryCount: number;
      includeGeometryFalseHasGeometryCount?: number;
      requiredNamesPresent: Record<string, boolean>;
      missingGeometry: number;
    } = {
      level: result.level,
      count: result.count,
      hasGeometryCount,
      requiredNamesPresent: presenceByName(result.features, requiredNames),
      missingGeometry: result.sourceSummary.missingGeometry,
    };

    if (parentAdcode === "320000") {
      const lightResult = await service.getAdminBoundaries({
        parentAdcode,
        level: "prefecture",
        includeGeometry: false,
      });
      check.includeGeometryFalseHasGeometryCount = lightResult.features.filter(
        (feature: { geometry?: unknown }) => feature.geometry,
      ).length;
    }

    multiProvincePrefectureChecks[parentAdcode] = check;
  }

  for (const [parentAdcode, config] of Object.entries(REQUIRED_COUNTY_API_CHECKS)) {
    const result = await service.getAdminBoundaries({
      parentAdcode,
      level: "county",
      includeGeometry: config.includeGeometry,
    });
    const hasGeometryCount = result.features.filter((feature: { geometry?: unknown }) => feature.geometry).length;

    countyApiChecks[parentAdcode] = {
      level: result.level,
      count: result.count,
      hasGeometryCount,
      includeGeometry: config.includeGeometry,
      requiredNamesPresent: presenceByName(result.features, config.requiredNames),
      missingGeometry: result.sourceSummary.missingGeometry,
    };
  }
  const requiredProvincePresence = Object.fromEntries(
    REQUIRED_PROVINCES.map((adcode) => [
      adcode,
      provinceResult.features.some((feature: { adcode: string }) => feature.adcode === adcode),
    ]),
  );
  const requiredPrefecturePresence = Object.fromEntries(
    REQUIRED_PREFECTURES.map((adcode) => [
      adcode,
      prefectureResult.features.some((feature: { adcode: string }) => feature.adcode === adcode),
    ]),
  );
  const requiredCountyPresence = Object.fromEntries(
    REQUIRED_SHENZHEN_COUNTIES.map((adcode) => [
      adcode,
      countyResult.features.some((feature: { adcode: string }) => feature.adcode === adcode),
    ]),
  );
  const provinceHasGeometryCount = provinceResult.features.filter((feature: { geometry?: unknown }) => feature.geometry).length;
  const provinceLightHasGeometryCount = provinceLightResult.features.filter((feature: { geometry?: unknown }) => feature.geometry).length;
  const prefectureHasGeometryCount = prefectureResult.features.filter((feature: { geometry?: unknown }) => feature.geometry).length;
  const countyHasGeometryCount = countyResult.features.filter((feature: { geometry?: unknown }) => feature.geometry).length;
  const ok =
    provinceResult.count >= 31 &&
    provinceHasGeometryCount === provinceResult.count &&
    provinceLightResult.count === provinceResult.count &&
    provinceLightHasGeometryCount === 0 &&
    Object.values(requiredProvincePresence).every(Boolean) &&
    provinceResult.sourceSummary.missingGeometry === 0 &&
    prefectureResult.count === 21 &&
    prefectureHasGeometryCount === 21 &&
    Object.values(requiredPrefecturePresence).every(Boolean) &&
    prefectureResult.sourceSummary.missingGeometry === 0 &&
    countyResult.count >= REQUIRED_SHENZHEN_COUNTIES.length &&
    countyHasGeometryCount === countyResult.count &&
    Object.values(requiredCountyPresence).every(Boolean) &&
    countyResult.sourceSummary.missingGeometry === 0 &&
    Object.values(multiProvincePrefectureChecks).every((check) =>
      check.count > 0 &&
      check.hasGeometryCount === check.count &&
      check.missingGeometry === 0 &&
      Object.values(check.requiredNamesPresent).every(Boolean) &&
      (check.includeGeometryFalseHasGeometryCount ?? 0) === 0,
    ) &&
    Object.values(countyApiChecks).every((check) =>
      check.count > 0 &&
      check.hasGeometryCount === (check.includeGeometry ? check.count : 0) &&
      check.missingGeometry === 0 &&
      Object.values(check.requiredNamesPresent).every(Boolean),
    );

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    supabaseHost: host,
    checks: {
      province: {
        parentAdcode: provinceResult.parentAdcode,
        level: provinceResult.level,
        count: provinceResult.count,
        hasGeometryCount: provinceHasGeometryCount,
        includeGeometryFalseHasGeometryCount: provinceLightHasGeometryCount,
        requiredProvincesPresent: requiredProvincePresence,
        missingGeometry: provinceResult.sourceSummary.missingGeometry,
        sources: provinceResult.sourceSummary.sources,
      },
      prefecture: {
        parentAdcode: prefectureResult.parentAdcode,
        level: prefectureResult.level,
        count: prefectureResult.count,
        hasGeometryCount: prefectureHasGeometryCount,
        requiredCitiesPresent: requiredPrefecturePresence,
        missingGeometry: prefectureResult.sourceSummary.missingGeometry,
        sources: prefectureResult.sourceSummary.sources,
      },
      county: {
        parentAdcode: countyResult.parentAdcode,
        level: countyResult.level,
        count: countyResult.count,
        hasGeometryCount: countyHasGeometryCount,
        requiredShenzhenCountiesPresent: requiredCountyPresence,
        missingGeometry: countyResult.sourceSummary.missingGeometry,
        sources: countyResult.sourceSummary.sources,
      },
      multiProvincePrefecture: multiProvincePrefectureChecks,
      nationwideCounty: countyApiChecks,
    },
    ok,
    secretValuesPrinted: false,
    geometryPayloadPrinted: false,
  }, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    status: "failed",
    error: error instanceof Error ? error.message : "Unknown admin boundaries API smoke error.",
    secretValuesPrinted: false,
    geometryPayloadPrinted: false,
  }, null, 2));
  process.exitCode = 1;
});
