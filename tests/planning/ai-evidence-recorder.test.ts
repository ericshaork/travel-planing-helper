import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildAiPlanEvidenceRows,
  SupabaseAiEvidenceRecorder,
} from "../../src/server/planning/aiEvidenceRecorder";
import type { EvidencePack } from "../../src/server/data-hub/evidencePackService";

const source = {
  provider: "amap",
  fieldName: "intro",
  externalId: "amap-1",
  confidence: 0.8,
  fetchedAt: "2026-10-06T00:00:00.000Z",
  lastVerifiedAt: "2026-10-06T00:00:00.000Z",
};

const pack: EvidencePack = {
  destination: "深圳",
  city: "深圳",
  travelDates: null,
  userPreferences: [],
  places: [
    {
      place: {
        id: "place-1",
        name: "深圳湾公园",
        lat: 22.5,
        lng: 113.9,
        address: "深圳市南山区滨海大道",
        category: "park",
        tags: [],
        status: "active",
        source,
        confidence: 0.8,
        lastVerifiedAt: source.lastVerifiedAt,
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
          tags: [],
          status: "active",
          source,
          confidence: 0.8,
          lastVerifiedAt: source.lastVerifiedAt,
          missingFields: [],
        },
        intro: "适合散步。",
        openingHours: null,
        ticketInfo: null,
        imageUrls: [],
        sources: [source],
        confidence: 0.8,
        lastVerifiedAt: source.lastVerifiedAt,
        missingFields: [],
      },
      sources: [source],
      missingFields: [],
      confidence: 0.8,
      freshness: { lastVerifiedAt: source.lastVerifiedAt, fetchedAt: [source.fetchedAt] },
    },
  ],
  weatherContext: [],
  routeEstimates: [],
  sourceList: [source],
  missingFields: [],
  freshness: { lastVerifiedAt: source.lastVerifiedAt, fetchedAt: [source.fetchedAt] },
  confidence: 0.8,
};

describe("AI evidence recorder", () => {
  it("builds ai_plan_evidence rows without raw provider payload", () => {
    const rows = buildAiPlanEvidenceRows({
      tripId: "trip-1",
      evidencePack: pack,
      reason: "generate_trip",
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({
      trip_id: "trip-1",
      place_id: "place-1",
      source_type: "place_profile",
      source_id: null,
    });
    expect(JSON.stringify(rows)).not.toContain("raw_snapshot");
    expect(JSON.stringify(rows)).not.toContain("raw_payload");
    expect(JSON.stringify(rows)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("inserts safe rows through the repository boundary", async () => {
    const inserted: unknown[] = [];
    const recorder = new SupabaseAiEvidenceRecorder({
      from() {
        return {
          async insert(values) {
            inserted.push(...values);
            return { error: null };
          },
        };
      },
    });

    const result = await recorder.recordAiPlanEvidence({
      evidencePack: pack,
      reason: "generate_trip",
    });

    expect(result.inserted).toBe(inserted.length);
    expect(JSON.stringify(inserted)).not.toContain("raw_snapshot");
    expect(JSON.stringify(inserted)).not.toContain("service_role");
  });
});
