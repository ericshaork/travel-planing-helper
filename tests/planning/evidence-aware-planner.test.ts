import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockLLMProvider } from "../../lib/ai/mock";
import type { LLMProvider } from "../../lib/ai/provider";
import type {
  GenerateTripInput,
  GenerateTripOutput,
  ParseTripInput,
  ParseTripOutput,
  RegenerateTripInput,
  RegenerateTripOutput,
  RepairJsonInput,
} from "../../lib/ai/types";
import { planTrip } from "../../lib/trip/planner";
import type { TripRequest } from "../../lib/trip/types";
import type { WeatherProvider } from "../../lib/weather/provider";
import type { EvidencePack } from "../../src/server/data-hub/evidencePackService";

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

const weatherProvider: WeatherProvider = {
  async getForecast() {
    return {
      city: "深圳",
      available: false,
      forecastDays: [],
      alerts: [],
      warnings: ["暂时无法获取实时天气，先给你一版不含实时天气的。"],
    };
  },
};

function evidencePack(): EvidencePack {
  const source = { provider: "amap", fieldName: "place", externalId: "amap-1", confidence: 0.8, fetchedAt: "2026-10-06T00:00:00.000Z", lastVerifiedAt: "2026-10-06T00:00:00.000Z" };
  const place = {
    id: "place-1",
    name: "深圳湾公园",
    lat: 22.5,
    lng: 113.9,
    address: "深圳市南山区滨海大道",
    category: "park",
    tags: ["海边"],
    status: "active" as const,
    source,
    confidence: 0.8,
    lastVerifiedAt: source.lastVerifiedAt,
    missingFields: [],
  };

  return {
    destination: "深圳",
    city: "深圳",
    travelDates: null,
    userPreferences: ["海边"],
    places: [
      {
        place,
        detail: {
          place,
          intro: "适合海边散步。",
          openingHours: null,
          ticketInfo: null,
          imageUrls: [],
          sources: [source],
          confidence: 0.8,
          lastVerifiedAt: source.lastVerifiedAt,
          missingFields: [
            { fieldName: "openingHours", reason: "not_returned", severity: "warning", message: "开放时间暂缺。" },
          ],
        },
        sources: [source],
        missingFields: [
          { fieldName: "openingHours", reason: "not_returned", severity: "warning", message: "开放时间暂缺。" },
        ],
        confidence: 0.8,
        freshness: { lastVerifiedAt: source.lastVerifiedAt, fetchedAt: [source.fetchedAt] },
      },
    ],
    weatherContext: [],
    routeEstimates: [],
    sourceList: [source],
    missingFields: [
      { fieldName: "openingHours", reason: "not_returned", severity: "warning", message: "开放时间暂缺。" },
    ],
    freshness: { lastVerifiedAt: source.lastVerifiedAt, fetchedAt: [source.fetchedAt] },
    confidence: 0.8,
  };
}

class CapturingLLMProvider implements LLMProvider {
  readonly providerName = "capturing";
  lastGenerateInput: GenerateTripInput | null = null;
  private readonly delegate = new MockLLMProvider();

  parseTrip(input: ParseTripInput): Promise<ParseTripOutput> {
    return this.delegate.parseTrip(input);
  }

  generateTrip(input: GenerateTripInput): Promise<GenerateTripOutput> {
    this.lastGenerateInput = input;
    return this.delegate.generateTrip(input);
  }

  regenerateTrip(input: RegenerateTripInput): Promise<RegenerateTripOutput> {
    return this.delegate.regenerateTrip(input);
  }

  repairJson<T>(input: RepairJsonInput<T>): Promise<T> {
    return this.delegate.repairJson(input);
  }
}

describe("evidence-aware planTrip", () => {
  it("builds evidence pack before generation and records safe evidence after success", async () => {
    const llmProvider = new CapturingLLMProvider();
    const recorded: unknown[] = [];
    const result = await planTrip(
      { tripRequest },
      {
        llmProvider,
        weatherProvider,
        evidencePackService: {
          async buildEvidencePack() {
            return evidencePack();
          },
        },
        evidenceRecorder: {
          async recordAiPlanEvidence(input) {
            recorded.push(input);
            return { attempted: 1, inserted: 1 };
          },
        },
      },
    );

    expect(llmProvider.lastGenerateInput?.evidencePromptSection).toContain("深圳湾公园");
    expect(llmProvider.lastGenerateInput?.evidenceWarnings).toContain("部分地点缺少开放时间，建议出行前确认。");
    expect(result.evidenceMetadata?.sources[0]?.provider).toBe("amap");
    expect(result.evidenceMetadata?.missingFields).toContain("openingHours");
    expect(recorded).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("raw_snapshot");
    expect(JSON.stringify(recorded)).not.toContain("raw_payload");
  });

  it("does not block original generation when Data Hub evidence is unavailable", async () => {
    const llmProvider = new CapturingLLMProvider();
    const result = await planTrip(
      { tripRequest },
      {
        llmProvider,
        weatherProvider,
        evidencePackService: {
          async buildEvidencePack() {
            throw new Error("database unavailable");
          },
        },
      },
    );

    expect(result.tripPlan.destination).toBe("深圳");
    expect(result.evidenceMetadata?.missingFields).toContain("evidencePack");
    expect(result.warnings?.join("")).toContain("Data Hub evidence pack 暂不可用");
    expect(llmProvider.lastGenerateInput?.evidencePromptSection).toContain("evidencePackStatus: unavailable");
  });
});
