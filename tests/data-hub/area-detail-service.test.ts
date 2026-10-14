import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAreaDetailEnrichPostHandler } from "../../app/api/data-hub/area-details/enrich/route";
import { createAreaDetailService, type AreaDetailRepository } from "../../src/server/data-hub/areaDetailService";
import type {
  AdminAreaDetailRecord,
  AdminAreaRecord,
  DestinationDetailRecord,
  DestinationRecord,
  TravelRegionDetailRecord,
  TravelRegionRecord,
} from "../../src/server/data-hub/types";

type Calls = Record<string, number>;

class MemoryAreaRepository implements AreaDetailRepository {
  calls: Calls = {
    getDestinationDetail: 0,
    getAdminAreaDetail: 0,
    getTravelRegionDetail: 0,
  };
  destinationDetail: DestinationDetailRecord | null = null;
  adminAreaDetail: AdminAreaDetailRecord | null = null;
  travelRegionDetail: TravelRegionDetailRecord | null = null;

  async getDestination(id: string): Promise<DestinationRecord | null> {
    return { id, name: "深圳", name_en: "Shenzhen", country_code: "CN", level: "city", parent_id: null, center_lat: null, center_lng: null, bounds: null, available: true, metadata: {}, created_at: "2026-09-30T00:00:00.000Z", updated_at: "2026-09-30T00:00:00.000Z" };
  }

  async getAdminArea(id: string): Promise<AdminAreaRecord | null> {
    return { id, destination_id: "dest-1", name: "南山区", adcode: "440305", level: "district", parent_adcode: "440300", polygon: null, center_lat: null, center_lng: null, source_provider: "amap", source_external_id: "440305", source_updated_at: null, created_at: "2026-09-30T00:00:00.000Z", updated_at: "2026-09-30T00:00:00.000Z" };
  }

  async getTravelRegion(id: string): Promise<TravelRegionRecord | null> {
    return { id, destination_id: "dest-1", name: "深圳湾", description: "海边慢行区域。", polygon: null, center_lat: null, center_lng: null, tags: ["海边"], suggested_duration_minutes: 120, priority: 1, source_type: "curated", created_at: "2026-09-30T00:00:00.000Z", updated_at: "2026-09-30T00:00:00.000Z" };
  }

  async getDestinationDetail(): Promise<DestinationDetailRecord | null> {
    this.calls.getDestinationDetail += 1;
    return this.destinationDetail;
  }

  async getAdminAreaDetail(): Promise<AdminAreaDetailRecord | null> {
    this.calls.getAdminAreaDetail += 1;
    return this.adminAreaDetail;
  }

  async getTravelRegionDetail(): Promise<TravelRegionDetailRecord | null> {
    this.calls.getTravelRegionDetail += 1;
    return this.travelRegionDetail;
  }

  async getRepresentativePlaces() {
    return [];
  }
}

describe("area detail service", () => {
  it("destination/admin/travel region detail 类型可 import 并在无数据时返回 partial + missingFields", async () => {
    const repository = new MemoryAreaRepository();
    const service = createAreaDetailService({ repository, now: () => new Date("2026-09-30T00:00:00.000Z") });

    const destination = await service.getDestinationDetail("dest-1");
    const admin = await service.getAdminAreaDetail("admin-1");
    const region = await service.getTravelRegionDetail("region-1");

    expect(destination.detail.destinationId).toBe("dest-1");
    expect(destination.missingFields.map((field) => field.fieldName)).toContain("intro");
    expect(admin.detail.adminAreaId).toBe("admin-1");
    expect(admin.missingFields.map((field) => field.fieldName)).toContain("travelSummary");
    expect(region.detail.travelRegionId).toBe("region-1");
    expect(region.missingFields.map((field) => field.fieldName)).toContain("playStyle");
  });

  it("travel region 不会查询 admin_area_details", async () => {
    const repository = new MemoryAreaRepository();
    const service = createAreaDetailService({ repository });

    await service.getTravelRegionDetail("region-1");

    expect(repository.calls.getTravelRegionDetail).toBe(1);
    expect(repository.calls.getAdminAreaDetail).toBe(0);
  });

  it("admin area 不会查询 travel_region_details", async () => {
    const repository = new MemoryAreaRepository();
    const service = createAreaDetailService({ repository });

    await service.getAdminAreaDetail("admin-1");

    expect(repository.calls.getAdminAreaDetail).toBe(1);
    expect(repository.calls.getTravelRegionDetail).toBe(0);
  });
});

describe("area detail API routes", () => {
  it("enrich API 不输出 raw provider response 或 API key", async () => {
    const handler = createAreaDetailEnrichPostHandler(() => createAreaDetailService({ repository: new MemoryAreaRepository(), now: () => new Date("2026-09-30T00:00:00.000Z") }));
    const response = await handler(new Request("http://localhost/api/data-hub/area-details/enrich", {
      method: "POST",
      body: JSON.stringify({
        targetType: "travel_region",
        travelRegionId: "region-1",
        name: "深圳湾",
        intro: "海边慢行区域。",
        sourceProvider: "wanderly_curated",
      }),
    }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("深圳湾");
    expect(text).not.toContain("raw_snapshot");
    expect(text).not.toContain("raw_json");
    expect(text).not.toContain("AMAP_API_KEY");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
