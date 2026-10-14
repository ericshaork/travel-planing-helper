import { describe, expect, it, vi } from "vitest";

import {
  ENTRY_SESSION_SOURCE_TYPES,
  ensureWorkspaceProjectEntry,
} from "../../lib/projects/entry-client";
import { getProjectSession } from "../../lib/projects/session";
import { getWorkspaceSessionMetadata, loadTripPlan } from "../../lib/trip/storage";
import type { StorageLike } from "../../lib/trip/storage";
import type { TravelProjectSessionSourceType } from "../../lib/projects/session";
import type { TravelProjectSourceType, TravelProjectVersionReason } from "../../lib/projects/types";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createTripPlan(title: string): TripPlan {
  return {
    tripTitle: title,
    summary: "mock",
    destination: "Yunnan",
    days: 5,
    travelStyleSummary: "relaxed",
    weatherSummary: {
      available: false,
      overview: "mock",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "mock",
    },
    budgetSummary: {
      totalEstimate: "6000",
      transport: "1200",
      hotel: "2000",
      food: "1200",
      tickets: "600",
      localTransport: "300",
      flexibleSpending: "700",
      note: "mock",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "mock",
      options: [
        {
          mode: "other",
          pros: ["mock"],
          cons: ["mock"],
          recommendation: "mock",
        },
      ],
      suggestedPlatforms: [],
      note: "mock",
    },
    dailyItinerary: Array.from({ length: 5 }, (_, index) => ({
        day: index + 1,
        theme: "mock",
        routeOrder: ["mock"],
        routeReason: "mock",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      })),
    generalTips: [],
    warnings: [],
  };
}

const tripRequest: TripRequest = {
  departureCity: "Shenzhen",
  destinationCity: "Yunnan",
  days: 5,
  budget: 6000,
  currency: "CNY",
  interests: ["food"],
  travelStyles: ["relaxed"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

interface EntryCase {
  label: string;
  sessionSourceType: TravelProjectSessionSourceType;
  createdFrom: TravelProjectVersionReason;
  expectedProjectSourceType: TravelProjectSourceType;
  expectedWorkspaceSourceType: string;
}

describe("entry client project/version boundary", () => {
  it.each<EntryCase>([
    {
      label: "AI create",
      sessionSourceType: ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
      createdFrom: "ai_generate",
      expectedProjectSourceType: "blank_input",
      expectedWorkspaceSourceType: "ai_generated",
    },
    {
      label: "Explore archive",
      sessionSourceType: ENTRY_SESSION_SOURCE_TYPES.exploreImport,
      createdFrom: "template_import",
      expectedProjectSourceType: "explore_archive",
      expectedWorkspaceSourceType: "explore_import",
    },
    {
      label: "File import",
      sessionSourceType: "uploaded_file",
      createdFrom: "import_transform",
      expectedProjectSourceType: "uploaded_file",
      expectedWorkspaceSourceType: "ai_generated",
    },
    {
      label: "Blank manual",
      sessionSourceType: ENTRY_SESSION_SOURCE_TYPES.blankManual,
      createdFrom: "manual_edit",
      expectedProjectSourceType: "blank_input",
      expectedWorkspaceSourceType: "blank_manual",
    },
  ])(
    "creates consistent project/version/session records for $label",
    async ({
      sessionSourceType,
      createdFrom,
      expectedProjectSourceType,
      expectedWorkspaceSourceType,
    }) => {
      const storage = new MemoryStorage();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            project: {
              id: "project-1",
              currentFlowStage: "workspace_ready",
            },
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            version: {
              id: "version-1",
            },
          }),
        )
        .mockResolvedValueOnce(createJsonResponse({ ok: true }));
      const tripPlan = createTripPlan(`${sessionSourceType} plan`);

      const result = await ensureWorkspaceProjectEntry(
        {
          title: tripPlan.tripTitle,
          sessionSourceType,
          sourceTitle: tripPlan.tripTitle,
          sourcePayload: {
            sourceOrigin: sessionSourceType,
          },
          tripPlan,
          tripRequest,
          createdFrom,
          lifecycleState: "workspace",
          flowStage: "workspace_ready",
          storage,
        },
        {
          fetcher,
          getAccessToken: async () => "token-123",
        },
      );

      const projectBody = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
        sourceType: TravelProjectSourceType;
        initialMetadata: {
          sourcePayload: {
            sourceOrigin: string;
          };
        };
      };
      const versionBody = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)) as {
        createdFrom: TravelProjectVersionReason;
        setAsCurrent: boolean;
        tripRequestSnapshot: TripRequest;
      };

      expect(projectBody.sourceType).toBe(expectedProjectSourceType);
      expect(projectBody.initialMetadata.sourcePayload.sourceOrigin).toBe(
        sessionSourceType,
      );
      expect(versionBody.createdFrom).toBe(createdFrom);
      expect(versionBody.setAsCurrent).toBe(true);
      expect(versionBody.tripRequestSnapshot.destinationCity).toBe("Yunnan");
      expect(result?.projectId).toBe("project-1");
      expect(result?.versionId).toBe("version-1");
      expect(getProjectSession(storage)?.sourceType).toBe(sessionSourceType);
      expect(getWorkspaceSessionMetadata(storage)?.sourceType).toBe(
        expectedWorkspaceSourceType,
      );
      expect(loadTripPlan(storage)?.tripTitle).toBe(tripPlan.tripTitle);
    },
  );
});
