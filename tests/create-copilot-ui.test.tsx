import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToStaticMarkup } from "react-dom/server";

import {
  CreateChatView,
  resolveClarifyingQuickOptions,
} from "../components/create/CreateChatView";
import { CreateCopilotConversationView } from "../components/trip/CreateCopilotPanel";
import { ProjectGenerationExperience } from "../components/trip/ProjectGenerationExperience";
import {
  generateCreateProposal,
  moveCreateProposalToAdjusting,
  restoreCreateCopilotSession,
  sendCreateCopilotMessage,
} from "../lib/projects/create-copilot-client";
import { setProjectSession } from "../lib/projects/session";
import {
  loadTripPlan,
  loadTripRequest,
  type StorageLike,
} from "../lib/trip/storage";

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

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

describe("create copilot UI integration", () => {
  it("sending a message calls the copilot API and returns assistant reply", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-1",
        sourceType: "blank_input",
        flowStage: "source_review",
      },
      storage,
    );
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse({
        success: true,
        projectId: "project-1",
        stage: "clarifying",
        reply: "Tell me your budget and pace.",
      }),
    );

    const result = await sendCreateCopilotMessage(
      "project-1",
      "I want to go to Yunnan",
      {
        fetcher,
        getAccessToken: async () => "token-123",
        storage,
      },
    );

    expect(fetcher).toHaveBeenCalledWith(
      "/api/projects/project-1/copilot",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result).toEqual({
      projectId: "project-1",
      flowStage: "clarifying",
      reply: "Tell me your budget and pace.",
    });
  });

  it("allows the dev guest bypass to continue the copilot flow without login", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockImplementation(async (_url, init) => {
      expect((init?.headers as Record<string, string>)["x-wanderly-dev-guest"]).toBe("1");

      return createJsonResponse({
        success: true,
        projectId: "project-guest",
        stage: "clarifying",
        reply: "Tell me the pace you prefer.",
      });
    });

    const result = await sendCreateCopilotMessage(
      "project-guest",
      "I want to go somewhere relaxing",
      {
        fetcher,
        getAccessToken: async () => null,
        allowGuestProjectAccess: true,
        storage,
      },
    );

    expect(result.projectId).toBe("project-guest");
    expect(result.flowStage).toBe("clarifying");
  });

  it("renders assistant messages in the conversation view", () => {
    const markup = renderToStaticMarkup(
      <CreateCopilotConversationView
        messages={[
          {
            id: "message-1",
            projectId: "project-1",
            role: "user",
            content: "I want to go to Yunnan",
            createdAt: "2026-07-23T00:00:00.000Z",
          },
          {
            id: "message-2",
            projectId: "project-1",
            role: "assistant",
            content: "Tell me your budget and pace.",
            createdAt: "2026-07-23T00:00:01.000Z",
          },
        ]}
        statusLabel="Clarifying details"
        isSending={false}
        inputValue=""
        onInputChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
        onStartOver={() => {}}
        onUseClassicFlow={() => {}}
        currentStage="clarifying"
        onAdjustProposal={() => {}}
        onGenerateProposal={() => {}}
        isGeneratingProposal={false}
      />,
    );

    expect(markup).toContain("Tell me your budget and pace.");
    expect(markup).toContain("Clarifying details");
  });

  it("renders clarifying as the AI travel consultant chat view", () => {
    const markup = renderToStaticMarkup(
      <CreateChatView
        messages={[
          {
            id: "message-1",
            projectId: "project-1",
            role: "user",
            content: "想去云南玩五天。",
            createdAt: "2026-07-25T00:00:00.000Z",
          },
          {
            id: "message-2",
            projectId: "project-1",
            role: "assistant",
            content: "这趟旅行大概准备多少预算？",
            createdAt: "2026-07-25T00:00:01.000Z",
          },
        ]}
        inputValue=""
        isSending={false}
        onInputChange={() => {}}
        onQuickOption={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />,
    );

    expect(markup).toContain("create-chat-view");
    expect(markup).toContain("想去云南玩五天。");
    expect(markup).toContain("这趟旅行大概准备多少预算？");
    expect(markup).toContain("AI 旅行顾问");
    expect(markup).toContain("继续回答 AI 旅行顾问");
    resolveClarifyingQuickOptions().forEach((option) => {
      expect(markup).toContain(option);
    });
  });

  it("keeps clarifying quick options focused on one-step answers", () => {
    expect(resolveClarifyingQuickOptions()).toEqual([
      "预算大概 6000，想玩 5 天。",
      "想看风景、吃本地小店，也留一点自由时间。",
      "不想早起，整体节奏轻松一点。",
    ]);
  });

  it("renders a proposal card when the flow reaches proposal_ready", () => {
    const markup = renderToStaticMarkup(
      <CreateCopilotConversationView
        messages={[
          {
            id: "message-1",
            projectId: "project-1",
            role: "user",
            content: "I want to go to Yunnan for 5 days with food and scenery.",
            createdAt: "2026-07-23T00:00:00.000Z",
          },
          {
            id: "message-2",
            projectId: "project-1",
            role: "assistant",
            content: "I have enough to draft a proposal now.",
            createdAt: "2026-07-23T00:00:01.000Z",
          },
        ]}
        statusLabel="Proposal ready"
        isSending={false}
        inputValue=""
        onInputChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
        onStartOver={() => {}}
        onUseClassicFlow={() => {}}
        currentStage="proposal_ready"
        onAdjustProposal={() => {}}
        onGenerateProposal={() => {}}
        isGeneratingProposal={false}
        proposalSummary={{
          title: "Yunnan 5-day proposal",
          routeSummary: "I have enough to draft a proposal now.",
          preferences: ["Food", "Nature"],
        }}
      />,
    );

    expect(markup).toContain("Proposal ready");
    expect(markup).toContain("Yunnan 5-day proposal");
    expect(markup).toContain("Food");
    expect(markup).toContain("生成完整计划");
  });

  it("restores an existing project conversation from project session", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-9",
        sourceType: "explore_import",
        flowStage: "source_review",
      },
      storage,
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-9",
            title: "Yunnan project",
            currentFlowStage: "proposal_ready",
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          messages: [
            {
              id: "message-1",
              projectId: "project-9",
              role: "user",
              content: "I want to go to Yunnan",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
            {
              id: "message-2",
              projectId: "project-9",
              role: "assistant",
              content: "I can draft a proposal now.",
              createdAt: "2026-07-23T00:00:01.000Z",
            },
          ],
        }),
      );

    const restored = await restoreCreateCopilotSession({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(restored).toEqual({
      projectId: "project-9",
      flowStage: "proposal_ready",
      messages: [
        {
          id: "message-1",
          projectId: "project-9",
          role: "user",
          content: "I want to go to Yunnan",
          createdAt: "2026-07-23T00:00:00.000Z",
        },
        {
          id: "message-2",
          projectId: "project-9",
          role: "assistant",
          content: "I can draft a proposal now.",
          createdAt: "2026-07-23T00:00:01.000Z",
        },
      ],
    });
  });

  it("keeps the classic-flow fallback available when the API fails", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          error: {
            code: "AI_GENERATION_FAILED",
            message: "Copilot is unavailable right now.",
          },
        },
        { status: 500 },
      ),
    );

    await expect(
      sendCreateCopilotMessage("project-1", "Hello", {
        fetcher,
        getAccessToken: async () => "token-123",
        storage,
      }),
    ).rejects.toThrow(/Copilot is unavailable right now/);

    const markup = renderToStaticMarkup(
      <CreateCopilotConversationView
        messages={[]}
        statusLabel="Starting planning"
        errorMessage="Copilot is unavailable right now."
        isSending={false}
        inputValue=""
        onInputChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
        onStartOver={() => {}}
        onUseClassicFlow={() => {}}
        currentStage="source_received"
        onAdjustProposal={() => {}}
        onGenerateProposal={() => {}}
        isGeneratingProposal={false}
      />,
    );

    expect(markup).toContain("Copilot is unavailable right now.");
  });

  it("moves a ready proposal back into adjusting", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse({
        success: true,
        projectId: "project-1",
        stage: "proposal_adjusting",
      }),
    );

    const result = await moveCreateProposalToAdjusting("project-1", {
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(result).toEqual({
      projectId: "project-1",
      flowStage: "proposal_adjusting",
    });
  });

  it("generates a full trip and stores the workspace payload", async () => {
    const storage = new MemoryStorage();
    const tripRequest = {
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
    const tripPlan = {
      tripTitle: "Yunnan 5 days",
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
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse({
        proposal: {
          destination: "Yunnan",
          duration: {
            days: 5,
          },
          preferences: ["food"],
          highlights: ["Yunnan"],
          notes: [],
        },
        tripRequest,
        tripPlan,
        versionId: "version-9",
        stage: "workspace_ready",
      }),
    );

    const result = await generateCreateProposal("project-1", {
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(result.versionId).toBe("version-9");
    expect(result.flowStage).toBe("workspace_ready");
    expect(loadTripRequest(storage)).toEqual(tripRequest);
    expect(loadTripPlan(storage)).toEqual(tripPlan);
  });

  it("renders the project generation experience with the loading assets", () => {
    const markup = renderToStaticMarkup(
      <ProjectGenerationExperience
        status="generating"
        destinationLabel="Yunnan"
        latestUserMessage="I want a food trip in Yunnan"
        onRetry={() => {}}
        onBack={() => {}}
      />,
    );

    expect(markup).toContain("Building Yunnan into a full trip.");
    expect(markup).toContain("loading_top_blank.png");
    expect(markup).toContain("loading_bottom_blank.png");
  });
});
