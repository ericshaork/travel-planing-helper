import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildUserPreferenceContext } from "../lib/ai/user-preference-context";
import { cloneDefaultUserSettings } from "../lib/settings/defaults";
import type { AIProvider } from "../lib/ai/provider/provider-types";
import {
  buildRevisionChatUserPrompt,
  createRevisionChatService,
} from "../lib/projects/revision-chat/revision-chat-service";
import type { TripPlan, TripRequest } from "../lib/trip/types";
import type { ProjectService } from "../lib/projects/service";

function makeTripPlan(): TripPlan {
  return {
    tripTitle: "Hangzhou Weekend",
    summary: "Lakeside walk and slower food stops",
    destination: "Hangzhou",
    days: 2,
    travelStyleSummary: "Relaxed couple trip",
    weatherSummary: {
      available: false,
      overview: "Weather unavailable",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "Weather unavailable",
    },
    budgetSummary: {
      totalEstimate: "Around 3000 CNY",
      transport: "Around 400 CNY",
      hotel: "Around 1200 CNY",
      food: "Around 800 CNY",
      tickets: "Around 300 CNY",
      localTransport: "Around 200 CNY",
      flexibleSpending: "Around 100 CNY",
      note: "Estimate only",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "Metro plus walk",
      options: [],
      suggestedPlatforms: [],
      note: "Local transit works well",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "West Lake",
        routeOrder: ["West Lake", "Longjing Village"],
        routeReason: "Short route",
        morning: [{ placeName: "West Lake", type: "attraction", reason: "Iconic", guide: [] }],
        afternoon: [{ placeName: "Longjing Village", type: "food", reason: "Tea", guide: [] }],
        evening: [],
        dailyTips: [],
      },
      {
        day: 2,
        theme: "City walk",
        routeOrder: ["Southern Song Imperial Street"],
        routeReason: "Relaxed ending",
        morning: [{ placeName: "Southern Song Imperial Street", type: "city_walk", reason: "Stroll", guide: [] }],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  };
}

function makeTripRequest(): TripRequest {
  return {
    departureCity: "Shanghai",
    destinationCity: "Hangzhou",
    days: 2,
    budget: 3000,
    currency: "CNY",
    interests: ["city walk", "food"],
    travelStyles: ["relaxed"],
    mustVisitPlaces: [],
    avoidPlaces: [],
  };
}

function makeProjectService(): ProjectService {
  return {
    createProject: async () => {
      throw new Error("not used");
    },
    getProject: async () => ({
      project: {
        id: "project-1",
        userId: "user-1",
        title: "Hangzhou weekend",
        lifecycleState: "workspace",
        currentFlowStage: "workspace_ready",
        currentVersionId: "version-1",
        lastActivityAt: "2026-07-27T00:00:00.000Z",
        createdAt: "2026-07-27T00:00:00.000Z",
        updatedAt: "2026-07-27T00:00:00.000Z",
      },
      currentVersion: null,
      sources: [],
    }),
    updateProjectState: async () => null,
    createProjectVersion: async () => {
      throw new Error("not used");
    },
    listProjectVersions: async () => [],
    getProjectVersion: async () => ({
      id: "version-1",
      projectId: "project-1",
      versionNumber: 1,
      versionStatus: "accepted",
      createdFrom: "ai_generate",
      tripPlan: makeTripPlan(),
      tripRequestSnapshot: makeTripRequest(),
      proposalSummary: null,
      createdBy: "assistant",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      managedStatus: "active",
      parentVersionId: null,
    } as never),
    addProjectSource: async () => {
      throw new Error("not used");
    },
    listProjectSources: async () => [],
    appendProjectMessage: async () => {
      throw new Error("not used");
    },
    listProjectMessages: async () => [],
  };
}

describe("revision chat user preference context", () => {
  it("adds long-term user preferences to the revision prompt", () => {
    const prompt = buildRevisionChatUserPrompt({
      tripPlan: makeTripPlan(),
      tripRequest: makeTripRequest(),
      versionNumber: 1,
      userMessage: "Make day two easier",
      userPreferenceContext: buildUserPreferenceContext(cloneDefaultUserSettings()),
    });

    expect(prompt).toContain("长期偏好");
    expect(prompt).toContain("本次项目需求为准");
  });

  it("passes user preference context through revision service", async () => {
    let capturedUserPrompt = "";
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse(input) {
        capturedUserPrompt = input.userPrompt;
        return { type: "reply", message: "ok" };
      },
    };
    const service = createRevisionChatService(makeProjectService(), {
      provider,
      versionService: {
        getVersion: async () => ({
          id: "version-1",
          projectId: "project-1",
          versionNumber: 1,
          versionStatus: "accepted",
          createdFrom: "ai_generate",
          tripPlan: makeTripPlan(),
          tripRequestSnapshot: makeTripRequest(),
          proposalSummary: null,
          createdBy: "assistant",
          createdAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-27T00:00:00.000Z",
          managedStatus: "active",
          parentVersionId: null,
        }),
      } as never,
    });

    await service.suggestModification({
      projectId: "project-1",
      versionId: "version-1",
      message: "Slow down day two",
      userPreferenceContext: buildUserPreferenceContext(cloneDefaultUserSettings()),
    });

    expect(capturedUserPrompt).toContain("长期偏好");
  });
});
