import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildEvidenceAwarePlanInput } from "../../src/server/planning/evidenceAwarePlanInput";
import type { EvidencePack } from "../../src/server/data-hub/evidencePackService";
import type { TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "深圳",
  days: 1,
  budget: 600,
  currency: "CNY",
  interests: ["海边"],
  travelStyles: ["轻松"],
  mustVisitPlaces: ["深圳湾公园"],
  avoidPlaces: [],
};

function createPack(): EvidencePack {
  return {
    destination: "深圳",
    city: "深圳",
    travelDates: null,
    userPreferences: ["海边"],
    places: [
      {
        place: {
          id: "place-1",
          name: "深圳湾公园",
          lat: 22.5,
          lng: 113.9,
          address: "深圳市南山区滨海大道",
          category: "park",
          tags: ["海边"],
          status: "active",
          source: { provider: "amap", fieldName: "place", externalId: "amap-1", confidence: 0.8, fetchedAt: "2026-10-06T00:00:00.000Z", lastVerifiedAt: "2026-10-06T00:00:00.000Z" },
          confidence: 0.8,
          lastVerifiedAt: "2026-10-06T00:00:00.000Z",
          missingFields: [],
        },
        detail: {
          place: {
            id: "place-1",
            name: "深圳湾公园",
            lat: 22.5,
            lng: 113.9,
            address: "深圳市南山区滨海大道",
            category: "park",
            tags: ["海边"],
            status: "active",
            source: { provider: "amap", fieldName: "place", externalId: "amap-1", confidence: 0.8, fetchedAt: "2026-10-06T00:00:00.000Z", lastVerifiedAt: "2026-10-06T00:00:00.000Z" },
            confidence: 0.8,
            lastVerifiedAt: "2026-10-06T00:00:00.000Z",
            missingFields: [],
          },
          intro: "适合海边散步。",
          openingHours: null,
          ticketInfo: null,
          imageUrls: [],
          sources: [{ provider: "amap", fieldName: "place", externalId: "amap-1", confidence: 0.8, fetchedAt: "2026-10-06T00:00:00.000Z", lastVerifiedAt: "2026-10-06T00:00:00.000Z" }],
          confidence: 0.8,
          lastVerifiedAt: "2026-10-06T00:00:00.000Z",
          missingFields: [
            { fieldName: "openingHours", reason: "not_returned", severity: "warning", message: "开放时间暂缺。" },
            { fieldName: "ticketInfo", reason: "not_returned", severity: "warning", message: "门票信息暂缺。" },
          ],
        },
        sources: [{ provider: "amap", fieldName: "place", externalId: "amap-1", confidence: 0.8, fetchedAt: "2026-10-06T00:00:00.000Z", lastVerifiedAt: "2026-10-06T00:00:00.000Z" }],
        missingFields: [
          { fieldName: "openingHours", reason: "not_returned", severity: "warning", message: "开放时间暂缺。" },
          { fieldName: "ticketInfo", reason: "not_returned", severity: "warning", message: "门票信息暂缺。" },
        ],
        confidence: 0.8,
        freshness: { lastVerifiedAt: "2026-10-06T00:00:00.000Z", fetchedAt: ["2026-10-06T00:00:00.000Z"] },
      },
    ],
    weatherContext: [],
    routeEstimates: [],
    sourceList: [{ provider: "amap", fieldName: "place", externalId: "amap-1", confidence: 0.8, fetchedAt: "2026-10-06T00:00:00.000Z", lastVerifiedAt: "2026-10-06T00:00:00.000Z" }],
    missingFields: [
      { fieldName: "openingHours", reason: "not_returned", severity: "warning", message: "开放时间暂缺。" },
      { fieldName: "ticketInfo", reason: "not_returned", severity: "warning", message: "门票信息暂缺。" },
    ],
    freshness: { lastVerifiedAt: "2026-10-06T00:00:00.000Z", fetchedAt: ["2026-10-06T00:00:00.000Z"] },
    confidence: 0.8,
  };
}

describe("buildEvidenceAwarePlanInput", () => {
  it("builds safe evidence prompt metadata and missing-field warnings", () => {
    const input = buildEvidenceAwarePlanInput({
      tripRequest,
      evidencePack: createPack(),
    });

    expect(input.evidencePromptSection).toContain("深圳湾公园");
    expect(input.evidencePromptSection).toContain("openingHours=待确认");
    expect(input.evidenceWarnings).toEqual(
      expect.arrayContaining([
        "部分地点缺少开放时间，建议出行前确认。",
        "部分地点缺少门票或预约信息，建议出行前确认。",
      ]),
    );
    expect(input.evidenceMetadata.sources[0]?.provider).toBe("amap");
    expect(input.evidenceMetadata.missingFields).toEqual(
      expect.arrayContaining(["openingHours", "ticketInfo"]),
    );
    expect(JSON.stringify(input)).not.toContain("raw_snapshot");
    expect(JSON.stringify(input)).not.toContain("service_role");
  });

  it("falls back to conservative warnings when evidence pack is unavailable", () => {
    const input = buildEvidenceAwarePlanInput({
      tripRequest,
      evidencePack: null,
    });

    expect(input.evidencePromptSection).toContain("evidencePackStatus: unavailable");
    expect(input.evidenceWarnings.join("")).toContain("Data Hub evidence pack 暂不可用");
    expect(input.evidenceMetadata.missingFields).toContain("evidencePack");
  });
});
