import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type {
  DataSourceSummary,
  DestinationRecord,
  MissingFieldNotice,
  NormalizedAdminAreaDetail,
  NormalizedDestinationDetail,
  NormalizedPlace,
  NormalizedPlaceDetail,
  NormalizedRouteEstimate,
  NormalizedTravelRegionDetail,
} from "../../src/server/data-hub/types";
import type {
  AdminRegion,
  AdminRegionLevel,
} from "../../src/server/data-hub/admin/types";

const require = createRequire(import.meta.url);
const auditModule = require("../../scripts/audit-data-providers.ts") as {
  GOOGLE_ENV_ALIASES: string[];
  WIKIMEDIA_ENV_ALIASES: string[];
  OSM_ENV_ALIASES: string[];
  auditProviders: (envNames: Set<string>) => Array<{ name: string; status: string; detectedVars: string[]; capabilities: Record<string, string> }>;
};

const migrationPath = path.resolve(process.cwd(), "supabase", "migrations", "008_data_hub_core.sql");
const migrationSql = readFileSync(migrationPath, "utf8");
const areaDetailMigrationPath = path.resolve(process.cwd(), "supabase", "migrations", "009_data_hub_area_details.sql");
const areaDetailMigrationSql = readFileSync(areaDetailMigrationPath, "utf8");
const adminGeographyMigrationPath = path.resolve(process.cwd(), "supabase", "migrations", "015_admin_geography_foundation.sql");
const adminGeographyMigrationSql = readFileSync(adminGeographyMigrationPath, "utf8");
const adminImportRpcMigrationPath = path.resolve(process.cwd(), "supabase", "migrations", "016_admin_regions_import_rpc.sql");
const adminImportRpcMigrationSql = readFileSync(adminImportRpcMigrationPath, "utf8");
const reportPath = path.resolve(process.cwd(), "docs", "WANDERLY_V2_DATA_PROVIDER_AUDIT.md");
const reportMarkdown = readFileSync(reportPath, "utf8");

describe("data hub provider audit", () => {
  it("识别 Google / Wikimedia / OSM alias，不把已配置 endpoint 误判为 missing", () => {
    expect(auditModule.GOOGLE_ENV_ALIASES).toEqual(
      expect.arrayContaining(["Google_MAP_API", "GOOGLE_MAPS_API_KEY", "GOOGLE_PLACES_API_KEY"]),
    );
    expect(auditModule.WIKIMEDIA_ENV_ALIASES).toEqual(
      expect.arrayContaining([
        "WIKIDATA_SPARQL_URL",
        "WIKIDATA_SPARQL_ENDPOINT",
        "WIKIMEDIA_API_URL",
        "WIKIMEDIA_COMMONS_API_URL",
        "WIKIPEDIA_API_URL",
        "WIKIPEDIA_ZH_API_URL",
        "WIKIPEDIA_EN_API_URL",
      ]),
    );
    expect(auditModule.OSM_ENV_ALIASES).toEqual(
      expect.arrayContaining(["NOMINATIM_BASE_URL", "OVERPASS_API_URL", "OSM_USER_AGENT"]),
    );

    const providers = auditModule.auditProviders(
      new Set(["GOOGLE_PLACES_API_KEY", "WIKIDATA_SPARQL_ENDPOINT", "WIKIPEDIA_ZH_API_URL", "NOMINATIM_BASE_URL", "OSM_USER_AGENT"]),
    );

    const google = providers.find((provider) => provider.name === "Google Maps / Places");
    const wikimedia = providers.find((provider) => provider.name === "Wikimedia / Wikipedia / Wikidata");
    const osm = providers.find((provider) => provider.name === "OpenStreetMap / Overpass / Nominatim");

    expect(google?.status).toBe("configured");
    expect(google?.detectedVars).toContain("GOOGLE_PLACES_API_KEY");
    expect(wikimedia?.status).toBe("configured");
    expect(wikimedia?.detectedVars).toEqual(expect.arrayContaining(["WIKIDATA_SPARQL_ENDPOINT", "WIKIPEDIA_ZH_API_URL"]));
    expect(osm?.status).toBe("partial");
    expect(osm?.detectedVars).toEqual(expect.arrayContaining(["NOMINATIM_BASE_URL", "OSM_USER_AGENT"]));
  });

  it("报告只输出变量名和能力判断，不输出 NAME=value 或常见 secret 形态", () => {
    expect(reportMarkdown).toContain("不读取、不展示、不记录任何 API key");
    expect(reportMarkdown).not.toMatch(/AMAP_API_KEY\s*=/);
    expect(reportMarkdown).not.toMatch(/GOOGLE_MAPS_API_KEY\s*=/);
    expect(reportMarkdown).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=/);
    expect(reportMarkdown).not.toMatch(/sk-[A-Za-z0-9_-]{12,}/);
    expect(reportMarkdown).not.toMatch(/eyJ[A-Za-z0-9_-]{12,}/);
    expect(reportMarkdown).not.toMatch(/AKIA[0-9A-Z]{16}/);
  });
});

describe("data hub TypeScript contracts", () => {
  it("行政区划 foundation 类型支持四档 level 和特殊 admin_type", () => {
    const level: AdminRegionLevel = "county";
    const beijingCounty: AdminRegion = {
      id: "region-1",
      adcode: "110105",
      name: "朝阳区",
      level,
      admin_type: "district",
      parent_adcode: "110000",
      province_adcode: "110000",
      prefecture_adcode: null,
      center_lng: 116.443,
      center_lat: 39.921,
      label_lng: 116.443,
      label_lat: 39.921,
      boundary: null,
      bbox_min_lng: null,
      bbox_min_lat: null,
      bbox_max_lng: null,
      bbox_max_lat: null,
      source: null,
      source_id: null,
      source_updated_at: null,
      metadata: {},
      created_at: "2026-10-07T00:00:00.000Z",
      updated_at: "2026-10-07T00:00:00.000Z",
    };

    expect(beijingCounty.level).toBe("county");
    expect(beijingCounty.prefecture_adcode).toBeNull();
  });

  it("数据合同类型可被正常 import，并支持 source / confidence / lastVerifiedAt / missingFields", () => {
    const source: DataSourceSummary = {
      provider: "wanderly_curated",
      fieldName: "name",
      confidence: 0.95,
      lastVerifiedAt: "2026-09-30T00:00:00.000Z",
    };
    const missing: MissingFieldNotice = {
      fieldName: "openingHours",
      reason: "not_returned",
      severity: "warning",
      message: "开放时间暂缺，需后续核验。",
    };
    const destination: DestinationRecord = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "深圳",
      name_en: "Shenzhen",
      country_code: "CN",
      level: "city",
      parent_id: null,
      center_lat: 22.5431,
      center_lng: 114.0579,
      bounds: null,
      available: true,
      metadata: {},
      created_at: "2026-09-30T00:00:00.000Z",
      updated_at: "2026-09-30T00:00:00.000Z",
    };
    const place: NormalizedPlace = {
      id: "00000000-0000-0000-0000-000000000002",
      name: "莲花山公园",
      lat: 22.554,
      lng: 114.064,
      tags: ["城市公园"],
      status: "active",
      source,
      confidence: 0.95,
      lastVerifiedAt: source.lastVerifiedAt ?? null,
      missingFields: [missing],
    };
    const detail: NormalizedPlaceDetail = {
      place,
      intro: "深圳市中心的城市公园。",
      imageUrls: [],
      sources: [source],
      confidence: 0.9,
      lastVerifiedAt: source.lastVerifiedAt ?? null,
      missingFields: [missing],
    };
    const destinationDetail: NormalizedDestinationDetail = {
      id: "destination-detail-1",
      destinationId: destination.id,
      name: destination.name,
      intro: null,
      travelSummary: null,
      bestSeason: null,
      suggestedDaysMin: null,
      suggestedDaysMax: null,
      primaryThemes: [],
      representativePlaces: [],
      transportSummary: null,
      weatherSummary: null,
      sourceSummary: [source],
      missingFields: [missing],
      lastVerifiedAt: null,
    };
    const adminAreaDetail: NormalizedAdminAreaDetail = {
      id: "admin-detail-1",
      adminAreaId: "admin-1",
      name: "南山区",
      intro: null,
      travelSummary: null,
      representativePlaces: [],
      transportSummary: null,
      suitableFor: [],
      sourceSummary: [source],
      missingFields: [missing],
      lastVerifiedAt: null,
    };
    const travelRegionDetail: NormalizedTravelRegionDetail = {
      id: "travel-region-detail-1",
      travelRegionId: "region-1",
      name: "深圳湾",
      intro: null,
      playStyle: null,
      suggestedRoute: null,
      representativePlaces: [],
      suitableFor: [],
      crowdLevel: null,
      sourceSummary: [source],
      missingFields: [missing],
      lastVerifiedAt: null,
    };
    const route: NormalizedRouteEstimate = {
      originPlaceId: place.id,
      destinationPlaceId: place.id,
      mode: "walking",
      distanceMeters: null,
      durationSeconds: null,
      provider: "amap",
      source,
      confidence: null,
      lastVerifiedAt: null,
      missingFields: [missing],
    };

    expect(destination.level).toBe("city");
    expect(detail.place.source.provider).toBe("wanderly_curated");
    expect(detail.missingFields[0]?.fieldName).toBe("openingHours");
    expect(route.missingFields[0]?.reason).toBe("not_returned");
    expect(destinationDetail.sourceSummary[0]?.provider).toBe("wanderly_curated");
    expect(adminAreaDetail.adminAreaId).toBe("admin-1");
    expect(travelRegionDetail.travelRegionId).toBe("region-1");
  });
});

describe("data hub Supabase migration", () => {
  it("migration 文件存在并包含 v2.0 数据底座核心表", () => {
    for (const tableName of [
      "destinations",
      "admin_areas",
      "travel_regions",
      "places",
      "place_details",
      "place_sources",
      "route_cache",
      "ai_plan_evidence",
    ]) {
      expect(migrationSql).toMatch(new RegExp(`create table if not exists public\\.${tableName}`, "i"));
    }
  });

  it("行政区划、旅行热点区域、地点三类数据保持分表", () => {
    expect(migrationSql).toMatch(/comment on table public\.admin_areas is 'Real administrative reference areas/i);
    expect(migrationSql).toMatch(/comment on table public\.travel_regions is 'Wanderly curated travel hotspot regions/i);
    expect(migrationSql).toMatch(/comment on table public\.places is 'Canonical points of interest/i);
    const travelRegionsBlock = migrationSql.match(/create table if not exists public\.travel_regions \([\s\S]*?\n\);/i)?.[0] ?? "";
    expect(travelRegionsBlock).not.toMatch(/adcode text/i);
    expect(travelRegionsBlock).not.toMatch(/parent_adcode text/i);
  });

  it("公共数据表只开放 select，不开放 anon/authenticated 写入策略", () => {
    expect(migrationSql).toMatch(/alter table public\.destinations enable row level security/i);
    expect(migrationSql).toMatch(/create policy "destinations_select_public"/i);
    expect(migrationSql).toMatch(/for select\s+to anon, authenticated\s+using \(true\)/i);
    expect(migrationSql).not.toMatch(/for insert\s+to anon/i);
    expect(migrationSql).not.toMatch(/for update\s+to anon/i);
    expect(migrationSql).not.toMatch(/for delete\s+to anon/i);
    expect(migrationSql).toMatch(/ai_plan_evidence may contain trip-specific reasoning/i);
  });

  it("area detail migration 包含 destination/admin/travel region 三类详情表和只读 RLS", () => {
    for (const tableName of [
      "destination_details",
      "admin_area_details",
      "travel_region_details",
    ]) {
      expect(areaDetailMigrationSql).toMatch(new RegExp(`create table if not exists public\\.${tableName}`, "i"));
      expect(areaDetailMigrationSql).toMatch(new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
      expect(areaDetailMigrationSql).toMatch(new RegExp(`${tableName}_select_public`, "i"));
    }

    expect(areaDetailMigrationSql).toMatch(/destination_id uuid not null references public\.destinations/i);
    expect(areaDetailMigrationSql).toMatch(/admin_area_id uuid not null references public\.admin_areas/i);
    expect(areaDetailMigrationSql).toMatch(/travel_region_id uuid not null references public\.travel_regions/i);
    expect(areaDetailMigrationSql).toMatch(/comment on table public\.admin_area_details is 'Details for real administrative areas only/i);
    expect(areaDetailMigrationSql).toMatch(/comment on table public\.travel_region_details is 'Details for Wanderly curated travel hotspot regions/i);
    expect(areaDetailMigrationSql).not.toMatch(/for insert\s+to anon/i);
    expect(areaDetailMigrationSql).not.toMatch(/for update\s+to anon/i);
  });

  it("admin geography migration 创建 PostGIS admin_regions 基础表", () => {
    expect(adminGeographyMigrationSql).toMatch(/create extension if not exists postgis/i);
    expect(adminGeographyMigrationSql).toMatch(/create table if not exists public\.admin_regions/i);
    expect(adminGeographyMigrationSql).toMatch(/id uuid primary key default gen_random_uuid\(\)/i);
    expect(adminGeographyMigrationSql).toMatch(/adcode text not null unique/i);
    expect(adminGeographyMigrationSql).toMatch(/boundary geometry\(MultiPolygon, 4326\)/i);
    expect(adminGeographyMigrationSql).toMatch(/metadata jsonb not null default '\{\}'::jsonb/i);
    expect(adminGeographyMigrationSql).toMatch(/level in \('country', 'province', 'prefecture', 'county'\)/i);
  });

  it("admin geography migration 包含层级索引、空间索引和 parent_adcode 自引用外键", () => {
    for (const indexName of [
      "admin_regions_level_idx",
      "admin_regions_parent_adcode_idx",
      "admin_regions_province_adcode_idx",
      "admin_regions_prefecture_adcode_idx",
    ]) {
      expect(adminGeographyMigrationSql).toMatch(new RegExp(`create index if not exists ${indexName}`, "i"));
    }

    expect(adminGeographyMigrationSql).toMatch(/using gist \(boundary\)/i);
    expect(adminGeographyMigrationSql).toMatch(/foreign key \(parent_adcode\)\s+references public\.admin_regions \(adcode\)\s+on update cascade\s+on delete restrict/i);
    expect(adminGeographyMigrationSql).toMatch(/create trigger admin_regions_updated_at/i);
  });

  it("admin regions import RPC 使用 PostGIS 转换 GeoJSON，避免客户端拼接 SQL", () => {
    expect(adminImportRpcMigrationSql).toMatch(/create or replace function public\.upsert_admin_regions_from_geojson\(regions jsonb\)/i);
    expect(adminImportRpcMigrationSql).toMatch(/jsonb_to_recordset\(regions\)/i);
    expect(adminImportRpcMigrationSql).toMatch(/st_geomfromgeojson\(row\.boundary_geojson::text\)/i);
    expect(adminImportRpcMigrationSql).toMatch(/on conflict \(adcode\) do update/i);
    expect(adminImportRpcMigrationSql).toMatch(/grant execute on function public\.upsert_admin_regions_from_geojson\(jsonb\)\s+to service_role/i);
  });
});
