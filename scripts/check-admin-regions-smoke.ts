const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const REQUIRED_PREFECTURES = ["440100", "440300", "441900", "442000"] as const;
const REQUIRED_PROVINCES = ["440000", "110000", "310000", "330000", "510000"] as const;
const REQUIRED_NATIONWIDE_PREFECTURE_PROVINCES = {
  "440000": ["广州市", "深圳市", "东莞市", "中山市"],
  "330000": ["杭州市", "宁波市", "温州市"],
  "510000": ["成都市"],
  "610000": ["西安市"],
  "350000": ["厦门市", "福州市"],
  "320000": ["南京市", "苏州市"],
  "370000": ["济南市", "青岛市"],
} as const;
const MUNICIPALITY_PROVINCES = {
  "110000": "北京市",
  "120000": "天津市",
  "310000": "上海市",
  "500000": "重庆市",
} as const;
const REQUIRED_SHENZHEN_COUNTIES = [
  "罗湖区",
  "福田区",
  "南山区",
  "宝安区",
  "龙岗区",
  "盐田区",
  "龙华区",
  "坪山区",
  "光明区",
] as const;
const REQUIRED_GUANGZHOU_COUNTIES = ["越秀区", "天河区", "海珠区", "番禺区"] as const;
const REQUIRED_NATIONWIDE_COUNTY_CITIES = {
  "110000": ["东城区", "西城区", "朝阳区", "海淀区"],
  "310000": ["黄浦区", "徐汇区", "浦东新区"],
  "440300": ["罗湖区", "福田区", "南山区", "宝安区", "龙岗区", "盐田区", "龙华区", "坪山区", "光明区"],
  "440100": ["越秀区", "天河区", "海珠区", "番禺区"],
  "330100": ["上城区", "西湖区", "余杭区", "萧山区"],
  "510100": ["锦江区", "武侯区", "青羊区", "成华区"],
  "610100": ["新城区", "碑林区", "雁塔区"],
  "350200": ["思明区", "湖里区", "集美区"],
  "320100": ["玄武区", "秦淮区", "鼓楼区"],
  "370200": ["市南区", "市北区", "崂山区"],
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

async function countRows(
  client: {
    from: (table: string) => {
      select: (columns: string, options?: { count?: "exact" }) => unknown;
    };
  },
  configure: (query: unknown) => PromiseLike<{ count: number | null; error: unknown }>,
) {
  const result = await configure(
    client
      .from("admin_regions")
      .select("adcode", { count: "exact" })
      .limit(1),
  );

  if (result.error) {
    throw new Error(JSON.stringify(result.error));
  }

  return result.count ?? 0;
}

async function countByParentLevel(
  client: Parameters<typeof countRows>[0],
  parentAdcode: string,
  level: string,
) {
  return countRows(client, (query: {
    eq: (column: string, value: string) => unknown;
  }) =>
    (query.eq("parent_adcode", parentAdcode) as {
      eq: (column: string, value: string) => PromiseLike<{ count: number | null; error: unknown }>;
    }).eq("level", level),
  );
}

async function countByLevel(
  client: Parameters<typeof countRows>[0],
  level: string,
) {
  return countRows(client, (query: {
    eq: (column: string, value: string) => PromiseLike<{ count: number | null; error: unknown }>;
  }) => query.eq("level", level));
}

async function countGeometryByParentLevel(
  client: Parameters<typeof countRows>[0],
  parentAdcode: string,
  level: string,
) {
  return countRows(client, (query: {
    eq: (column: string, value: string) => unknown;
  }) =>
    ((query.eq("parent_adcode", parentAdcode) as {
      eq: (column: string, value: string) => unknown;
    }).eq("level", level) as {
      not: (column: string, operator: string, value: null) => PromiseLike<{ count: number | null; error: unknown }>;
    }).not("boundary", "is", null),
  );
}

async function countGeometryByLevel(
  client: Parameters<typeof countRows>[0],
  level: string,
) {
  return countRows(client, (query: {
    eq: (column: string, value: string) => {
      not: (column: string, operator: string, value: null) => PromiseLike<{ count: number | null; error: unknown }>;
    };
  }) => query.eq("level", level).not("boundary", "is", null));
}

function presenceByName(rows: Array<{ name: string }>, names: readonly string[]) {
  const rowNames = new Set(rows.map((row) => row.name));
  return Object.fromEntries(names.map((name) => [name, rowNames.has(name)]));
}

async function readPrefectureProvinceChecks(
  client: Parameters<typeof countRows>[0],
) {
  const entries = Object.entries(REQUIRED_NATIONWIDE_PREFECTURE_PROVINCES);
  const checks: Record<string, {
    count: number;
    hasGeometryCount: number;
    requiredNamesPresent: Record<string, boolean>;
  }> = {};

  for (const [parentAdcode, requiredNames] of entries) {
    const { data, error } = await (client.from("admin_regions") as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => PromiseLike<{
            data: Array<{ adcode: string; name: string; level: string; parent_adcode: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    })
      .select("adcode,name,level,parent_adcode")
      .eq("parent_adcode", parentAdcode)
      .eq("level", "prefecture");

    if (error) {
      throw new Error(error.message);
    }

    checks[parentAdcode] = {
      count: data?.length ?? 0,
      hasGeometryCount: await countGeometryByParentLevel(client, parentAdcode, "prefecture"),
      requiredNamesPresent: presenceByName(data ?? [], requiredNames),
    };
  }

  return checks;
}

async function readMunicipalityPrefectureChecks(
  client: Parameters<typeof countRows>[0],
) {
  const checks: Record<string, { name: string; prefectureChildren: number }> = {};

  for (const [adcode, name] of Object.entries(MUNICIPALITY_PROVINCES)) {
    checks[adcode] = {
      name,
      prefectureChildren: await countByParentLevel(client, adcode, "prefecture"),
    };
  }

  return checks;
}

async function readCountyCityChecks(
  client: Parameters<typeof countRows>[0],
) {
  const checks: Record<string, {
    count: number;
    hasGeometryCount: number;
    requiredNamesPresent: Record<string, boolean>;
  }> = {};

  for (const [parentAdcode, requiredNames] of Object.entries(REQUIRED_NATIONWIDE_COUNTY_CITIES)) {
    const { data, error } = await (client.from("admin_regions") as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => PromiseLike<{
            data: Array<{ adcode: string; name: string; level: string; parent_adcode: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    })
      .select("adcode,name,level,parent_adcode")
      .eq("parent_adcode", parentAdcode)
      .eq("level", "county");

    if (error) {
      throw new Error(error.message);
    }

    checks[parentAdcode] = {
      count: data?.length ?? 0,
      hasGeometryCount: await countGeometryByParentLevel(client, parentAdcode, "county"),
      requiredNamesPresent: presenceByName(data ?? [], requiredNames),
    };
  }

  return checks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 admin regions smoke。");
  }

  const env = parseEnvFile(args.envPath);
  const { createClient } = await import("@supabase/supabase-js");
  const { url, serviceRoleKey, host } = requireSupabaseEnv(env);
  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data: provinceRows, error: provinceError } = await client
    .from("admin_regions")
    .select("adcode,name,level,admin_type,parent_adcode,province_adcode,prefecture_adcode,center_lng,center_lat,label_lng,label_lat,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,source,source_updated_at")
    .eq("adcode", "440000")
    .limit(1);

  if (provinceError) {
    throw new Error(provinceError.message);
  }

  const province = provinceRows?.[0] ?? null;
  const provinceGeometryCount = await countRows(client, (query: {
    eq: (column: string, value: string) => unknown;
  }) =>
    (query.eq("adcode", "440000") as {
      not: (column: string, operator: string, value: null) => PromiseLike<{ count: number | null; error: unknown }>;
    }).not("boundary", "is", null),
  );
  const chinaProvinceCount = await countByParentLevel(client, "100000", "province");
  const chinaProvinceGeometryCount = await countGeometryByParentLevel(client, "100000", "province");
  const nationwidePrefectureCount = await countByLevel(client, "prefecture");
  const nationwidePrefectureGeometryCount = await countGeometryByLevel(client, "prefecture");
  const nationwideCountyCount = await countByLevel(client, "county");
  const nationwideCountyGeometryCount = await countGeometryByLevel(client, "county");
  const nationwidePrefectureProvinceChecks = await readPrefectureProvinceChecks(client);
  const nationwideCountyCityChecks = await readCountyCityChecks(client);
  const municipalityPrefectureChecks = await readMunicipalityPrefectureChecks(client);
  const prefectureCount = await countByParentLevel(client, "440000", "prefecture");
  const prefectureGeometryCount = await countGeometryByParentLevel(client, "440000", "prefecture");
  const shenzhenCountyCount = await countByParentLevel(client, "440300", "county");
  const shenzhenCountyGeometryCount = await countGeometryByParentLevel(client, "440300", "county");
  const guangzhouCountyCount = await countByParentLevel(client, "440100", "county");
  const guangzhouCountyGeometryCount = await countGeometryByParentLevel(client, "440100", "county");
  const dongguanCountyCount = await countByParentLevel(client, "441900", "county");
  const zhongshanCountyCount = await countByParentLevel(client, "442000", "county");
  const { data: requiredProvinceRows, error: requiredProvinceError } = await client
    .from("admin_regions")
    .select("adcode,name,level,parent_adcode")
    .in("adcode", REQUIRED_PROVINCES);

  if (requiredProvinceError) {
    throw new Error(requiredProvinceError.message);
  }

  const { data: requiredRows, error: requiredError } = await client
    .from("admin_regions")
    .select("adcode,name,level,admin_type,parent_adcode,province_adcode,prefecture_adcode,center_lng,center_lat,label_lng,label_lat,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat")
    .in("adcode", REQUIRED_PREFECTURES);

  if (requiredError) {
    throw new Error(requiredError.message);
  }

  const { data: shenzhenRows, error: shenzhenError } = await client
    .from("admin_regions")
    .select("adcode,name,level,parent_adcode,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,center_lng,center_lat,label_lng,label_lat")
    .eq("parent_adcode", "440300")
    .eq("level", "county");

  if (shenzhenError) {
    throw new Error(shenzhenError.message);
  }

  const { data: guangzhouRows, error: guangzhouError } = await client
    .from("admin_regions")
    .select("adcode,name,level,parent_adcode,bbox_min_lng,bbox_min_lat,bbox_max_lng,bbox_max_lat,center_lng,center_lat,label_lng,label_lat")
    .eq("parent_adcode", "440100")
    .eq("level", "county");

  if (guangzhouError) {
    throw new Error(guangzhouError.message);
  }

  const requiredByAdcode = new Map(
    (requiredRows ?? []).map((row: { adcode: string }) => [row.adcode, row]),
  );
  const requiredPresence = Object.fromEntries(
    REQUIRED_PREFECTURES.map((adcode) => [adcode, requiredByAdcode.has(adcode)]),
  );
  const requiredProvinceByAdcode = new Map(
    (requiredProvinceRows ?? []).map((row: { adcode: string }) => [row.adcode, row]),
  );
  const requiredProvincePresence = Object.fromEntries(
    REQUIRED_PROVINCES.map((adcode) => [adcode, requiredProvinceByAdcode.has(adcode)]),
  );
  const shenzhenCountyPresence = presenceByName(shenzhenRows ?? [], REQUIRED_SHENZHEN_COUNTIES);
  const guangzhouCountyPresence = presenceByName(guangzhouRows ?? [], REQUIRED_GUANGZHOU_COUNTIES);
  const directCitiesArePrefectureOnly = ["441900", "442000"].every((adcode) => {
    const row = requiredByAdcode.get(adcode) as { level?: string; admin_type?: string } | undefined;
    return row?.level === "prefecture" && row.admin_type !== "county";
  });
  const centerReadableCount = (requiredRows ?? []).filter(
    (row: { center_lng: number | null; center_lat: number | null }) =>
      row.center_lng !== null && row.center_lat !== null,
  ).length;
  const bboxReadableCount = (requiredRows ?? []).filter(
    (row: {
      bbox_min_lng: number | null;
      bbox_min_lat: number | null;
      bbox_max_lng: number | null;
      bbox_max_lat: number | null;
    }) =>
      row.bbox_min_lng !== null &&
      row.bbox_min_lat !== null &&
      row.bbox_max_lng !== null &&
      row.bbox_max_lat !== null,
  ).length;
  const labelPointReadable = (requiredRows ?? []).every(
    (row: { label_lng?: number | null; label_lat?: number | null }) =>
      Object.prototype.hasOwnProperty.call(row, "label_lng") &&
      Object.prototype.hasOwnProperty.call(row, "label_lat"),
  );
  const shenzhenFieldsReadable = (shenzhenRows ?? []).every((row: {
    bbox_min_lng: number | null;
    bbox_min_lat: number | null;
    bbox_max_lng: number | null;
    bbox_max_lat: number | null;
    center_lng: number | null;
    center_lat: number | null;
    label_lng: number | null;
    label_lat: number | null;
  }) =>
    row.bbox_min_lng !== null &&
    row.bbox_min_lat !== null &&
    row.bbox_max_lng !== null &&
    row.bbox_max_lat !== null &&
    row.center_lng !== null &&
    row.center_lat !== null &&
    row.label_lng !== null &&
    row.label_lat !== null);
  const guangzhouFieldsReadable = (guangzhouRows ?? []).every((row: {
    bbox_min_lng: number | null;
    bbox_min_lat: number | null;
    bbox_max_lng: number | null;
    bbox_max_lat: number | null;
    center_lng: number | null;
    center_lat: number | null;
    label_lng: number | null;
    label_lat: number | null;
  }) =>
    row.bbox_min_lng !== null &&
    row.bbox_min_lat !== null &&
    row.bbox_max_lng !== null &&
    row.bbox_max_lat !== null &&
    row.center_lng !== null &&
    row.center_lat !== null &&
    row.label_lng !== null &&
    row.label_lat !== null);
  const ok =
    Boolean(province) &&
    chinaProvinceCount >= 31 &&
    chinaProvinceGeometryCount === chinaProvinceCount &&
    Object.values(requiredProvincePresence).every(Boolean) &&
    nationwidePrefectureCount >= 330 &&
    nationwidePrefectureGeometryCount === nationwidePrefectureCount &&
    nationwideCountyCount >= 2800 &&
    nationwideCountyGeometryCount === nationwideCountyCount &&
    Object.values(nationwidePrefectureProvinceChecks).every((check) =>
      check.count > 0 &&
      check.hasGeometryCount === check.count &&
      Object.values(check.requiredNamesPresent).every(Boolean),
    ) &&
    Object.values(municipalityPrefectureChecks).every(
      (check) => check.prefectureChildren === 0,
    ) &&
    Object.values(nationwideCountyCityChecks).every((check) =>
      check.count > 0 &&
      check.hasGeometryCount === check.count &&
      Object.values(check.requiredNamesPresent).every(Boolean),
    ) &&
    provinceGeometryCount === 1 &&
    prefectureCount === 21 &&
    prefectureGeometryCount === 21 &&
    Object.values(requiredPresence).every(Boolean) &&
    directCitiesArePrefectureOnly &&
    shenzhenCountyCount >= REQUIRED_SHENZHEN_COUNTIES.length &&
    shenzhenCountyGeometryCount === shenzhenCountyCount &&
    Object.values(shenzhenCountyPresence).every(Boolean) &&
    shenzhenFieldsReadable &&
    guangzhouCountyCount >= REQUIRED_GUANGZHOU_COUNTIES.length &&
    guangzhouCountyGeometryCount === guangzhouCountyCount &&
    Object.values(guangzhouCountyPresence).every(Boolean) &&
    guangzhouFieldsReadable &&
    dongguanCountyCount === 0 &&
    zhongshanCountyCount === 0 &&
    centerReadableCount === REQUIRED_PREFECTURES.length &&
    bboxReadableCount === REQUIRED_PREFECTURES.length &&
    labelPointReadable;

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    supabaseHost: host,
    checks: {
      chinaProvinceCount,
      chinaProvinceGeometryCount,
      requiredProvincesPresent: requiredProvincePresence,
      nationwidePrefectureCount,
      nationwidePrefectureGeometryCount,
      nationwideCountyCount,
      nationwideCountyGeometryCount,
      nationwidePrefectureProvinceChecks,
      nationwideCountyCityChecks,
      municipalityPrefectureChecks,
      guangdongProvinceExists: Boolean(province),
      guangdongProvinceHasGeometry: provinceGeometryCount === 1,
      prefectureChildrenOfGuangdong: prefectureCount,
      prefectureChildrenWithGeometry: prefectureGeometryCount,
      requiredCitiesPresent: requiredPresence,
      dongguanZhongshanArePrefectureNotCounty: directCitiesArePrefectureOnly,
      shenzhenCountyCount,
      shenzhenCountyGeometryCount,
      shenzhenCountyPresence,
      shenzhenFieldsReadable,
      guangzhouCountyCount,
      guangzhouCountyGeometryCount,
      guangzhouCountyPresence,
      guangzhouFieldsReadable,
      dongguanCountyCount,
      zhongshanCountyCount,
      bboxReadableCount,
      centerReadableCount,
      labelPointFieldsReadable: labelPointReadable,
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
    error: error instanceof Error ? error.message : "Unknown admin regions smoke error.",
    secretValuesPrinted: false,
    geometryPayloadPrinted: false,
  }, null, 2));
  process.exitCode = 1;
});
