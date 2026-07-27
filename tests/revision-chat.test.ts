import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildRevisionChatUserPrompt,
  createRevisionChatService,
  REVISION_CHAT_SYSTEM_PROMPT,
} from "../lib/projects/revision-chat/revision-chat-service";
import { buildUserPreferenceContext } from "../lib/ai/user-preference-context";
import { revisionChatResponseSchema } from "../lib/projects/revision-chat/revision-chat-types";
import type { AIProvider } from "../lib/ai/provider/provider-types";
import type { TripPlan, TripRequest } from "../lib/trip/types";
import type { ProjectService } from "../lib/projects/service";
import { cloneDefaultUserSettings } from "../lib/settings/defaults";

function makeTripPlan(): TripPlan {
  return {
    tripTitle: "西安 3 日情侣行",
    summary: "皇城 + 历史 + 陕味小吃",
    destination: "西安",
    days: 3,
    travelStyleSummary: "情侣舒缓",
    weatherSummary: {
      available: false,
      overview: "未接入实时天气",
      dailyForecast: [],
      alerts: [],
      reminders: ["出发前再看天气"],
      dataNote: "未接入实时天气",
    },
    budgetSummary: {
      totalEstimate: "约 3000 元",
      transport: "约 400 元",
      hotel: "约 1200 元",
      food: "约 600 元",
      tickets: "约 500 元",
      localTransport: "约 200 元",
      flexibleSpending: "约 100 元",
      note: "预算估算",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "高铁 + 地铁为主",
      options: [
        {
          mode: "high_speed_rail",
          pros: ["速度快"],
          cons: ["票价高"],
          recommendation: "深圳北 → 西安北 高铁",
        },
      ],
      suggestedPlatforms: ["12306"],
      note: "自由行组合",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "皇城初印象",
        routeOrder: ["西安城墙", "陕西历史博物馆", "老米家肉丸胡辣汤"],
        routeReason: "同城步行 + 地铁 15 分钟内",
        morning: [
          {
            placeName: "西安城墙",
            type: "attraction",
            reason: "首站开阔视角",
            suggestedDuration: "约 2 小时",
            guide: ["南门永宁门起"],
          },
        ],
        afternoon: [
          {
            placeName: "陕西历史博物馆",
            type: "attraction",
            reason: "命中历史文化",
            suggestedDuration: "约 2.5 小时",
            guide: ["需预约"],
          },
        ],
        evening: [
          {
            placeName: "老米家肉丸胡辣汤",
            type: "food",
            reason: "命中美食",
            suggestedDuration: "约 1 小时",
            guide: [],
          },
        ],
        dailyTips: ["提前预约博物馆门票"],
      },
      {
        day: 2,
        theme: "大雁塔与钟鼓楼",
        routeOrder: ["大慈恩寺", "钟楼", "回民街"],
        routeReason: "地铁 2 号线直达",
        morning: [
          { placeName: "大慈恩寺", type: "attraction", reason: "地标", guide: [] },
        ],
        afternoon: [
          { placeName: "钟楼", type: "attraction", reason: "过渡", guide: [] },
        ],
        evening: [
          { placeName: "回民街", type: "food", reason: "夜市", guide: [] },
        ],
        dailyTips: ["晚上稍晚回酒店"],
      },
      {
        day: 3,
        theme: "永兴坊与小雁塔",
        routeOrder: ["永兴坊", "小雁塔", "西安城墙夜游"],
        routeReason: "南城收尾",
        morning: [
          { placeName: "永兴坊", type: "food", reason: "非遗小吃", guide: [] },
        ],
        afternoon: [
          { placeName: "小雁塔", type: "attraction", reason: "小众", guide: [] },
        ],
        evening: [
          {
            placeName: "西安城墙夜游",
            type: "experience",
            reason: "光影收官",
            guide: [],
          },
        ],
        dailyTips: ["注意夜游关门时间"],
      },
    ],
    generalTips: ["带身份证进景区"],
    warnings: ["夏季注意防晒"],
  };
}

function makeTripRequest(): TripRequest {
  return {
    departureCity: "深圳",
    destinationCity: "西安",
    days: 3,
    budget: 3000,
    currency: "CNY",
    interests: ["历史文化", "美食"],
    travelStyles: ["情侣同行", "舒适优先"],
    mustVisitPlaces: [],
    avoidPlaces: ["兵马俑"],
  };
}

function makeStubProjectService(): ProjectService {
  return {
    async createProject() {
      throw new Error("not used");
    },
    async getProject() {
      return {
        project: {
          id: "project-1",
          userId: "user-1",
          title: "test",
          lifecycleState: "workspace",
          currentFlowStage: "workspace_ready",
          currentVersionId: "version-1",
          lastActivityAt: "2026-07-26T00:00:00.000Z",
          createdAt: "2026-07-26T00:00:00.000Z",
          updatedAt: "2026-07-26T00:00:00.000Z",
        },
        currentVersion: null,
        sources: [],
      };
    },
    async updateProjectState() {
      throw new Error("not used");
    },
    async createProjectVersion() {
      throw new Error("not used");
    },
    async listProjectVersions() {
      return [];
    },
    async getProjectVersion() {
      return {
        id: "version-1",
        projectId: "project-1",
        versionNumber: 1,
        versionStatus: "accepted",
        createdFrom: "ai_generate",
        tripPlan: makeTripPlan(),
        tripRequestSnapshot: makeTripRequest(),
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      };
    },
    async addProjectSource() {
      throw new Error("not used");
    },
    async listProjectSources() {
      return [];
    },
    async appendProjectMessage() {
      throw new Error("not used");
    },
    async listProjectMessages() {
      return [];
    },
  };
}

describe("buildRevisionChatUserPrompt", () => {
  it("把 tripPlan / tripRequest / 版本号 / 用户消息全部展开", () => {
    const prompt = buildRevisionChatUserPrompt({
      tripPlan: makeTripPlan(),
      tripRequest: makeTripRequest(),
      versionNumber: 1,
      userMessage: "第二天不要大雁塔，换一个轻松一点的地方",
    });

    expect(prompt).toContain("你正在帮助用户调整当前旅行计划：第 V1 版");
    expect(prompt).toContain("目的地：西安");
    expect(prompt).toContain("天数：3 天");
    expect(prompt).toContain("第 2 天｜大雁塔与钟鼓楼");
    expect(prompt).toContain("上午：大慈恩寺（attraction）");
    expect(prompt).toContain("兴趣：历史文化、美食");
    expect(prompt).toContain("出行风格 / 同行人：情侣同行、舒适优先");
    expect(prompt).toContain("避免（avoidPlaces，硬红线）：兵马俑");
    expect(prompt).toContain("预算：约 3000 CNY");
    expect(prompt).toContain("第二天不要大雁塔，换一个轻松一点的地方");
  });

  it("会附带最近的对话历史（最多 10 条）", () => {
    const prompt = buildRevisionChatUserPrompt({
      tripPlan: makeTripPlan(),
      tripRequest: makeTripRequest(),
      versionNumber: 2,
      userMessage: "那第三天呢？",
      history: [
        { role: "user", content: "第二天不要大雁塔" },
        { role: "assistant", content: "好的，替换成钟楼片区如何？" },
      ],
    });

    expect(prompt).toContain("最近的对话（自上而下按时间顺序）");
    expect(prompt).toContain("用户：第二天不要大雁塔");
    expect(prompt).toContain("助手：好的，替换成钟楼片区如何？");
  });

  it("展开每个时段的全部地点，不再只暴露第一个", () => {
    const tripPlan = makeTripPlan();
    // 用户点名的地点排在下午第二位，旧实现会把它整个丢掉。
    tripPlan.dailyItinerary[1].afternoon = [
      { placeName: "钟楼", type: "attraction", reason: "过渡", guide: [] },
      { placeName: "大雁塔", type: "attraction", reason: "地标", guide: [] },
    ];

    const prompt = buildRevisionChatUserPrompt({
      tripPlan,
      tripRequest: makeTripRequest(),
      versionNumber: 1,
      versionId: "version-1",
      userMessage: "第二天不要大雁塔",
    });

    expect(prompt).toContain("versionId：version-1");
    expect(prompt).toContain("完整每日安排（这是本轮讨论的唯一依据）");
    expect(prompt).toContain("下午：钟楼（attraction）、大雁塔（attraction）");
  });

  it("带上五问对话，缺失时降级为占位而不是丢字段", () => {
    const withTranscript = buildRevisionChatUserPrompt({
      tripPlan: makeTripPlan(),
      tripRequest: makeTripRequest(),
      versionNumber: 1,
      userMessage: "第二天太累了",
      interviewMessages: [
        { role: "assistant", content: "这次会和谁一起出发？" },
        { role: "user", content: "和女朋友，想轻松一点" },
      ],
    });

    expect(withTranscript).toContain("用户五问对话（创建这份计划时的原始需求");
    expect(withTranscript).toContain("用户：和女朋友，想轻松一点");

    const withoutTranscript = buildRevisionChatUserPrompt({
      tripPlan: makeTripPlan(),
      tripRequest: makeTripRequest(),
      versionNumber: 1,
      userMessage: "第二天太累了",
    });

    expect(withoutTranscript).toContain("用户五问对话：（暂无记录）");
  });
  it("includes long-term user preferences in the revision prompt when available", () => {
    const prompt = buildRevisionChatUserPrompt({
      tripPlan: makeTripPlan(),
      tripRequest: makeTripRequest(),
      versionNumber: 1,
      userMessage: "第二天轻松一点",
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
    const service = createRevisionChatService(makeStubProjectService(), {
      provider,
    });

    await service.suggestModification({
      projectId: "project-1",
      versionId: "version-1",
      message: "第二天不要太累",
      userPreferenceContext: buildUserPreferenceContext(cloneDefaultUserSettings()),
    });

    expect(capturedUserPrompt).toContain("长期偏好");
  });
});

describe("REVISION_CHAT_SYSTEM_PROMPT", () => {
  it("明确禁止重新生成 tripPlan，并列出两种返回结构", () => {
    expect(REVISION_CHAT_SYSTEM_PROMPT).toContain("绝对不重新生成完整 tripPlan");
    expect(REVISION_CHAT_SYSTEM_PROMPT).toContain("modification_suggestion");
    expect(REVISION_CHAT_SYSTEM_PROMPT).toContain('"type": "reply"');
    expect(REVISION_CHAT_SYSTEM_PROMPT).toContain(
      "action=replace 或 action=add 时必须给出 replacement",
    );
    expect(REVISION_CHAT_SYSTEM_PROMPT).toContain("硬红线");
  });
});

describe("revisionChatResponseSchema", () => {
  it("接受合法的 modification_suggestion", () => {
    const parsed = revisionChatResponseSchema.safeParse({
      type: "modification_suggestion",
      message: "把第二天的大雁塔换成轻松散步。",
      changes: [
        {
          day: 2,
          action: "replace",
          target: "大雁塔",
          replacement: "大唐芙蓉园",
          reason: "情侣散步节奏更轻松，命中历史文化兴趣",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("接受合法的 reply", () => {
    const parsed = revisionChatResponseSchema.safeParse({
      type: "reply",
      message: "3000 元的预算安排 3 天西安足够。",
    });
    expect(parsed.success).toBe(true);
  });

  it("拒绝 modification_suggestion 缺少 changes / action 不合法", () => {
    expect(
      revisionChatResponseSchema.safeParse({
        type: "modification_suggestion",
        message: "改",
        changes: [],
      }).success,
    ).toBe(false);

    expect(
      revisionChatResponseSchema.safeParse({
        type: "modification_suggestion",
        message: "改",
        changes: [
          {
            day: 2,
            action: "swap",
            target: "大雁塔",
            reason: "test",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("拒绝顶层 type 缺失", () => {
    expect(
      revisionChatResponseSchema.safeParse({
        message: "改",
      }).success,
    ).toBe(false);
  });
});

describe("createRevisionChatService", () => {
  function makeStubProjectService(
    versionOverride: Partial<{
      tripPlan: TripPlan;
      tripRequestSnapshot: TripRequest | null;
      versionNumber: number;
    }> = {},
  ): ProjectService {
    return {
      async createProject() {
        throw new Error("not used");
      },
      async getProject() {
        return {
          project: {
            id: "project-1",
            title: "test",
            lifecycleState: "workspace",
            currentFlowStage: "workspace_ready",
            currentVersionId: "version-1",
            lastActivityAt: "2026-07-26T00:00:00.000Z",
            createdAt: "2026-07-26T00:00:00.000Z",
            updatedAt: "2026-07-26T00:00:00.000Z",
          },
          currentVersion: null,
          sources: [],
        };
      },
      async updateProjectState() {
        throw new Error("not used");
      },
      async createProjectVersion() {
        throw new Error("not used");
      },
      async listProjectVersions() {
        return [];
      },
      async getProjectVersion() {
        return {
          id: "version-1",
          projectId: "project-1",
          versionNumber: versionOverride.versionNumber ?? 1,
          versionStatus: "accepted",
          createdFrom: "ai_generate",
          tripPlan: versionOverride.tripPlan ?? makeTripPlan(),
          tripRequestSnapshot:
            versionOverride.tripRequestSnapshot ?? makeTripRequest(),
          createdAt: "2026-07-26T00:00:00.000Z",
          updatedAt: "2026-07-26T00:00:00.000Z",
        };
      },
      async addProjectSource() {
        throw new Error("not used");
      },
      async listProjectSources() {
        return [];
      },
      async appendProjectMessage() {
        throw new Error("not used");
      },
      async listProjectMessages() {
        return [];
      },
    };
  }

  it("送进 provider 的 prompt 带上当前版本、完整行程与五问历史", async () => {
    let capturedSystemPrompt = "";
    let capturedUserPrompt = "";
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse(input) {
        capturedSystemPrompt = input.systemPrompt;
        capturedUserPrompt = input.userPrompt;
        return { type: "reply", message: "收到" };
      },
    };

    const projectService = makeStubProjectService();
    projectService.listProjectMessages = async () => [
      {
        id: "message-1",
        projectId: "project-1",
        role: "assistant" as const,
        content: "这次会和谁一起出发？",
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      {
        id: "message-2",
        projectId: "project-1",
        role: "user" as const,
        content: "和女朋友，想轻松一点",
        createdAt: "2026-07-26T00:01:00.000Z",
      },
    ];

    const service = createRevisionChatService(projectService, { provider });

    await service.suggestModification({
      projectId: "project-1",
      versionId: "version-1",
      message: "第二天不要大雁塔",
      history: [{ role: "user", content: "第二天不要大雁塔" }],
    });

    expect(capturedSystemPrompt).toContain("你正在帮助用户调整当前旅行计划");
    expect(capturedUserPrompt).toContain("第 V1 版");
    expect(capturedUserPrompt).toContain("versionId：version-1");
    expect(capturedUserPrompt).toContain("完整每日安排");
    expect(capturedUserPrompt).toContain("大雁塔与钟鼓楼");
    expect(capturedUserPrompt).toContain("用户：和女朋友，想轻松一点");
    expect(capturedUserPrompt).toContain("用户要求：");
  });

  it("五问历史读取失败时不阻断本轮讨论", async () => {
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse() {
        return { type: "reply", message: "收到" };
      },
    };

    const projectService = makeStubProjectService();
    projectService.listProjectMessages = async () => {
      throw new Error("messages unavailable");
    };

    const service = createRevisionChatService(projectService, { provider });

    const result = await service.suggestModification({
      projectId: "project-1",
      versionId: "version-1",
      message: "这个路线合理吗",
    });

    expect(result.type).toBe("reply");
  });

  it("把 provider 的合法 modification_suggestion 直通返回", async () => {
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse() {
        return {
          type: "modification_suggestion",
          message: "把第二天的大雁塔换成大唐芙蓉园，情侣夜景更适合。",
          changes: [
            {
              day: 2,
              action: "replace",
              target: "大雁塔",
              replacement: "大唐芙蓉园",
              reason: "情侣舒缓夜景 + 历史文化兴趣",
            },
          ],
        };
      },
    };
    const service = createRevisionChatService(makeStubProjectService(), {
      provider,
    });

    const result = await service.suggestModification({
      projectId: "project-1",
      versionId: "version-1",
      message: "第二天不要大雁塔，换个轻松的",
    });

    expect(result.type).toBe("modification_suggestion");
    if (result.type === "modification_suggestion") {
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.replacement).toBe("大唐芙蓉园");
    }
  });

  it("provider 返回非法结构时降级为 reply，不 throw", async () => {
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse() {
        return {
          // 缺 type 字段 → schema 会拒
          message: "路线整体挺合理的，可以按当前方案执行。",
        };
      },
    };
    const service = createRevisionChatService(makeStubProjectService(), {
      provider,
    });

    const result = await service.suggestModification({
      projectId: "project-1",
      versionId: "version-1",
      message: "这个路线合理吗？",
    });

    expect(result.type).toBe("reply");
    expect(result.message).toContain("整体挺合理的");
  });

  it("versionId 找不到时抛错", async () => {
    const badProjectService: ProjectService = {
      ...makeStubProjectService(),
      async getProjectVersion() {
        return null;
      },
    };
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse() {
        throw new Error("not reached");
      },
    };
    const service = createRevisionChatService(badProjectService, { provider });

    await expect(
      service.suggestModification({
        projectId: "project-1",
        versionId: "not-existing",
        message: "hi",
      }),
    ).rejects.toThrow();
  });

  it("拒绝空消息", async () => {
    const provider: AIProvider = {
      providerName: "stub",
      async generateConversationResponse() {
        throw new Error("not reached");
      },
    };
    const service = createRevisionChatService(makeStubProjectService(), {
      provider,
    });

    await expect(
      service.suggestModification({
        projectId: "project-1",
        versionId: "version-1",
        message: "   ",
      }),
    ).rejects.toThrow();
  });
});
