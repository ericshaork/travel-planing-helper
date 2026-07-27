import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getStructuredImportMissingFieldLabels,
  parseStructuredTravelFile,
} from "../lib/projects/file-import";
import { importStructuredTravelFile } from "../lib/projects/file-import-client";
import { getProjectSession } from "../lib/projects/session";
import type { StorageLike } from "../lib/trip/storage";
import type { TripPlan } from "../lib/trip/types";

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

function createTripPlan(): TripPlan {
  return {
    tripTitle: "Yunnan import",
    summary: "A generated trip from imported file.",
    destination: "Yunnan",
    days: 5,
    travelStyleSummary: "Relaxed and food-focused.",
    weatherSummary: {
      available: false,
      overview: "Weather can be checked later.",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "No real-time weather in this test.",
    },
    budgetSummary: {
      totalEstimate: "4000 CNY",
      transport: "1000 CNY",
      hotel: "1500 CNY",
      food: "800 CNY",
      tickets: "300 CNY",
      localTransport: "200 CNY",
      flexibleSpending: "200 CNY",
      note: "Draft estimate.",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "Transport details can be refined later.",
      options: [
        {
          mode: "other",
          pros: ["Simple test fixture."],
          cons: ["No real booking data."],
          recommendation: "Refine after import.",
        },
      ],
      suggestedPlatforms: [],
      note: "Fixture only.",
    },
    dailyItinerary: Array.from({ length: 5 }, (_, index) => ({
      day: index + 1,
      theme: `Day ${index + 1}`,
      routeOrder: ["Spot A", "Spot B"],
      routeReason: "Generated for test coverage.",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: ["Keep the pace flexible."],
    })),
    generalTips: ["Imported from structured file."],
    warnings: [],
  };
}

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

describe("structured travel file parsing", () => {
  it("parses a valid markdown template into a draft", () => {
    const markdown = `
# destination
Yunnan

# days
5

# budget
4000

# travelCompanion
partner

# interests
- food
- culture

# preferences
relaxed

# avoidPlaces
- crowded attractions

# specialRequirements
No early mornings
`.trim();

    const parsed = parseStructuredTravelFile(markdown);

    expect(parsed.missingTemplateFields).toEqual([]);
    expect(parsed.draft.destinationCity).toBe("Yunnan");
    expect(parsed.draft.days).toBe(5);
    expect(parsed.draft.budget).toBe(4000);
    expect(parsed.draft.interests).toEqual(["food", "culture"]);
    expect(parsed.draft.travelStyles).toEqual(["relaxed"]);
    expect(parsed.draft.avoidPlaces).toEqual(["crowded attractions"]);
    expect(parsed.draft.specialRequirements).toContain("No early mornings");
    expect(parsed.draft.specialRequirements).toContain("同行人：partner");
  });

  it("flags missing required fields for an incomplete txt file", () => {
    const text = `
destination: Yunnan
days: 5
budget: 3000
interests: food
`.trim();

    const parsed = parseStructuredTravelFile(text);

    expect(getStructuredImportMissingFieldLabels(parsed.missingTemplateFields)).toEqual([
      "同行人",
      "避开地点",
      "特殊要求",
      "行程节奏",
    ]);
  });
});

describe("structured travel file import client", () => {
  it("creates project, source, version, and revision handoff from a valid md file", async () => {
    const storage = new MemoryStorage();
    const tripPlan = createTripPlan();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (url, init) => {
        expect(url).toBe("/api/parse-trip");
        const body = JSON.parse(String(init?.body)) as { text: string };
        expect(body.text).toContain("destination");
        return createJsonResponse({
          parsed: {
            destinationCity: "Yunnan",
            days: 5,
            interests: ["food", "culture"],
            travelStyles: ["relaxed"],
          },
          missingFields: [],
          followUpQuestions: [],
        });
      })
      .mockImplementationOnce(async (url, init) => {
        expect(url).toBe("/api/generate-trip");
        const body = JSON.parse(String(init?.body)) as {
          tripRequest: {
            destinationCity: string;
            days: number;
            budget: number;
          };
        };
        expect(body.tripRequest.destinationCity).toBe("Yunnan");
        expect(body.tripRequest.days).toBe(5);
        expect(body.tripRequest.budget).toBe(4000);
        return createJsonResponse({
          tripPlan,
        });
      })
      .mockImplementationOnce(async (url, init) => {
        expect(url).toBe("/api/projects");
        const body = JSON.parse(String(init?.body)) as {
          sourceType: string;
          initialMetadata: {
            sourceTitle: string;
            sourcePayload: {
              fileName: string;
              fileType: string;
              parsedRequest: {
                destinationCity: string;
              };
            };
          };
        };
        expect(body.sourceType).toBe("uploaded_file");
        expect(body.initialMetadata.sourceTitle).toBe("yunnan-plan.md");
        expect(body.initialMetadata.sourcePayload.fileName).toBe("yunnan-plan.md");
        expect(body.initialMetadata.sourcePayload.fileType).toBe("text/markdown");
        expect(body.initialMetadata.sourcePayload.parsedRequest.destinationCity).toBe(
          "Yunnan",
        );
        return createJsonResponse({
          project: {
            id: "project-file-1",
            currentFlowStage: "workspace_ready",
          },
        });
      })
      .mockImplementationOnce(async (url, init) => {
        expect(url).toBe("/api/projects/project-file-1/versions");
        const body = JSON.parse(String(init?.body)) as {
          createdFrom: string;
          tripRequestSnapshot: {
            destinationCity: string;
          };
          setAsCurrent: boolean;
        };
        expect(body.createdFrom).toBe("import_transform");
        expect(body.tripRequestSnapshot.destinationCity).toBe("Yunnan");
        expect(body.setAsCurrent).toBe(true);
        return createJsonResponse({
          version: {
            id: "version-file-1",
          },
        });
      })
      .mockImplementationOnce(async (url) => {
        expect(url).toBe("/api/projects/project-file-1/state");
        return createJsonResponse({ ok: true });
      });

    const file = new File(
      [
        `
# destination
Yunnan
# days
5
# budget
4000
# travelCompanion
partner
# interests
food, culture
# preferences
relaxed
# avoidPlaces
crowded attractions
# specialRequirements
No early mornings
`.trim(),
      ],
      "yunnan-plan.md",
      { type: "text/markdown" },
    );

    const result = await importStructuredTravelFile(
      {
        file,
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(result.projectId).toBe("project-file-1");
    expect(result.versionId).toBe("version-file-1");
    expect(result.revisionHref).toBe(
      "/create?source=revision&projectId=project-file-1&versionId=version-file-1",
    );
    expect(result.tripPlan.tripTitle).toBe("Yunnan import");
    expect(getProjectSession(storage)).toEqual({
      projectId: "project-file-1",
      versionId: "version-file-1",
      sourceType: "uploaded_file",
      flowStage: "workspace_ready",
      updatedAt: expect.any(String),
    });
  });

  it("blocks generation when required template fields are missing", async () => {
    const file = new File(
      [
        `
destination: Yunnan
days: 5
budget: 3000
interests: food
`.trim(),
      ],
      "invalid.txt",
      { type: "text/plain" },
    );

    await expect(
      importStructuredTravelFile(
        {
          file,
        },
        {
          fetcher: vi.fn(),
          getAccessToken: async () => "token-123",
        },
      ),
    ).rejects.toThrow("导入文件缺少必要旅行信息，请补充后重新导入。");
  });
});
