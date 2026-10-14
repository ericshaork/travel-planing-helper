import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildCreateFlowParseText,
  buildInterviewBootstrapPlan,
  submitCreateFlow,
  submitInterviewParseTrip,
} from "../lib/projects/create-flow-client";
import { resolveBootstrapNotice } from "../components/create/CreateChatWorkspace";
import { getProjectSession } from "../lib/projects/session";
import { type StorageLike } from "../lib/trip/storage";
import type { ParseTripResponse } from "../lib/trip/types";

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

function createParseResult(
  overrides: Partial<ParseTripResponse> = {},
): ParseTripResponse {
  return {
    parsed: {
      departureCity: "Shanghai",
      destinationCity: "Yunnan",
      days: 5,
      interests: ["food"],
      travelStyles: ["relaxed"],
    },
    missingFields: ["budget"],
    followUpQuestions: ["What budget range do you want to stay within?"],
    ...overrides,
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

describe("create flow project integration", () => {
  it("creates a TravelProject and persists the first user message without calling parse-trip", async () => {
    const storage = new MemoryStorage();
    const requestedUrls: string[] = [];
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (_url, init) => {
        requestedUrls.push(String(_url));
        expect(_url).toBe("/api/projects");
        const body = JSON.parse(String(init?.body)) as {
          title: string;
          sourceType: string;
          initialMetadata: {
            flowStage: string;
            sourcePayload: {
              rawInput: string;
              selectedInterests: string[];
              parseResult?: unknown;
            };
          };
        };

        expect(body.sourceType).toBe("blank_input");
        expect(body.initialMetadata.flowStage).toBe("source_received");
        expect(body.initialMetadata.sourcePayload.rawInput).toBe(
          "I want to go to Yunnan for 5 days",
        );
        expect(body.initialMetadata.sourcePayload.selectedInterests).toEqual([
          "food",
        ]);
        expect(body.initialMetadata.sourcePayload.parseResult).toBeUndefined();

        return createJsonResponse({
          project: {
            id: "project-1",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockImplementationOnce(async (_url) => {
        requestedUrls.push(String(_url));
        expect(_url).toBe("/api/projects/project-1/messages");
        return createJsonResponse({
          messages: [
            {
              id: "message-1",
              projectId: "project-1",
              role: "user",
              content: "seed",
              createdAt: "2026-07-26T00:00:00.000Z",
            },
          ],
        });
      });

    const result = await submitCreateFlow(
      {
        rawInput: "I want to go to Yunnan for 5 days",
        selectedInterests: ["food"],
        selectedTravelStyles: ["relaxed"],
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(requestedUrls).toEqual([
      "/api/projects",
      "/api/projects/project-1/messages",
    ]);
    expect(requestedUrls).not.toContain("/api/parse-trip");
    expect(result.projectSession).toEqual({
      projectId: "project-1",
      sourceType: "ai_prompt",
      flowStage: "source_received",
      updatedAt: expect.any(String),
    });
    expect(getProjectSession(storage)).toEqual({
      projectId: "project-1",
      sourceType: "ai_prompt",
      flowStage: "source_received",
      updatedAt: expect.any(String),
    });
    expect(result.bootstrapReply).toBeUndefined();
  });

  it("returns a null projectSession when no auth is available and does not call parse-trip", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn();

    const result = await submitCreateFlow(
      {
        rawInput: "I want a relaxed 2-day Hangzhou trip",
        selectedInterests: [],
        selectedTravelStyles: ["relaxed"],
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => null,
      },
    );

    expect(result.projectSession).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(getProjectSession(storage)).toBeNull();
  });

  it("returns a null projectSession when the stored auth token is expired", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "当前登录状态已经失效，请重新登录后再试。",
          },
        },
        { status: 401 },
      ),
    );

    const result = await submitCreateFlow(
      {
        rawInput: "I want a relaxed 2-day Hangzhou trip",
        selectedInterests: [],
        selectedTravelStyles: ["relaxed"],
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => "expired-token",
      },
    );

    expect(result.projectSession).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getProjectSession(storage)).toBeNull();
  });

  it("keeps the flow stage returned by the create-project response and persists the first user message", async () => {
    const storage = new MemoryStorage();
    const requestedUrls: string[] = [];
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (url) => {
        requestedUrls.push(String(url));
        return createJsonResponse({
          project: {
            id: "project-9",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockImplementationOnce(async (url) => {
        requestedUrls.push(String(url));
        return createJsonResponse({
          messages: [
            {
              id: "message-9",
              projectId: "project-9",
              role: "user",
              content: "seed",
              createdAt: "2026-07-26T00:00:00.000Z",
            },
          ],
        });
      });

    await submitCreateFlow(
      {
        rawInput: "I want to go to Yunnan for 5 days",
        selectedInterests: ["food"],
        selectedTravelStyles: ["relaxed"],
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(getProjectSession(storage)?.flowStage).toBe("source_received");
    expect(requestedUrls).toEqual([
      "/api/projects",
      "/api/projects/project-9/messages",
    ]);
  });

  it("allows local guest project bootstrap when the dev bypass is enabled", async () => {
    const storage = new MemoryStorage();
    const requestedUrls: string[] = [];
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (_url, init) => {
        requestedUrls.push(String(_url));
        expect(_url).toBe("/api/projects");
        expect((init?.headers as Record<string, string>)["x-wanderly-dev-guest"]).toBe(
          "1",
        );

        return createJsonResponse({
          project: {
            id: "project-guest",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockImplementationOnce(async (_url, init) => {
        requestedUrls.push(String(_url));
        expect(_url).toBe("/api/projects/project-guest/messages");
        expect((init?.headers as Record<string, string>)["x-wanderly-dev-guest"]).toBe(
          "1",
        );

        return createJsonResponse({
          messages: [
            {
              id: "message-guest",
              projectId: "project-guest",
              role: "user",
              content: "I want to go to Yunnan",
              createdAt: "2026-07-26T00:00:00.000Z",
            },
          ],
        });
      });

    const result = await submitCreateFlow(
      {
        rawInput: "I want to go to Yunnan",
        selectedInterests: [],
        selectedTravelStyles: [],
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => null,
        allowGuestProjectAccess: true,
      },
    );

    expect(result.projectSession?.projectId).toBe("project-guest");
    expect(result.bootstrapReply).toBeUndefined();
    expect(requestedUrls).not.toContain("/api/parse-trip");
  });

  it("builds parse text without breaking the existing parse-trip input enrichment", () => {
    expect(
      buildCreateFlowParseText(
        "I want to go to Yunnan",
        ["food", "culture"],
        ["relaxed"],
      ),
    ).toBe("I want to go to Yunnan；补充偏好：喜欢food、culture；希望relaxed。");
  });
});

describe("submitInterviewParseTrip", () => {
  it("POSTs the aggregated interview text to /api/parse-trip and returns the parseResult", async () => {
    const parseResult = createParseResult();
    const requestedUrls: string[] = [];
    const requestedBodies: unknown[] = [];
    const fetcher = vi.fn().mockImplementationOnce(async (url, init) => {
      requestedUrls.push(String(url));
      requestedBodies.push(JSON.parse(String(init?.body)));
      return createJsonResponse(parseResult);
    });

    const result = await submitInterviewParseTrip(
      { text: "答案1；答案2；答案3；答案4；答案5" },
      { fetcher },
    );

    expect(result).toEqual(parseResult);
    expect(requestedUrls).toEqual(["/api/parse-trip"]);
    expect(requestedBodies).toEqual([
      { text: "答案1；答案2；答案3；答案4；答案5" },
    ]);
  });

  it("throws with the server error message when the parse-trip response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse(
        { error: { code: "UNKNOWN_ERROR", message: "上游解析失败" } },
        { status: 500 },
      ),
    );

    await expect(
      submitInterviewParseTrip({ text: "test" }, { fetcher }),
    ).rejects.toThrow("上游解析失败");
  });
});

describe("五问提交不得触发登录跳转", () => {
  it("拿不到 token 时报告 no_auth，让调用方留在本页而不是跳登录", async () => {
    const storage = new MemoryStorage();

    const result = await submitCreateFlow(
      {
        rawInput: "想去厦门玩 3 天",
        selectedInterests: [],
        selectedTravelStyles: [],
        storage,
      },
      { fetcher: vi.fn(), getAccessToken: async () => null },
    );

    expect(result.projectSession).toBeNull();
    expect(result.failureReason).toBe("no_auth");
  });

  it("已登录但接口 401 时报告 unauthorized，并保留服务端原因", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "当前登录状态已经失效，请重新登录后再试。",
          },
        },
        { status: 401 },
      ),
    );

    const result = await submitCreateFlow(
      {
        rawInput: "想去厦门玩 3 天",
        selectedInterests: [],
        selectedTravelStyles: [],
        storage,
      },
      { fetcher, getAccessToken: async () => "valid-token" },
    );

    expect(result.projectSession).toBeNull();
    expect(result.failureReason).toBe("unauthorized");
    expect(result.failureMessage).toBe("当前登录状态已经失效，请重新登录后再试。");
  });

  it("建项目成功时不带 failureReason", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: { id: "project-ok", currentFlowStage: "source_received" },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ messages: [] }));

    const result = await submitCreateFlow(
      {
        rawInput: "想去厦门玩 3 天",
        selectedInterests: [],
        selectedTravelStyles: [],
        storage,
      },
      { fetcher, getAccessToken: async () => "valid-token" },
    );

    expect(result.projectSession?.projectId).toBe("project-ok");
    expect(result.failureReason).toBeUndefined();
  });

  it("已登录被 401 时提示登录失效，而不是笼统地要求登录", () => {
    const notice = resolveBootstrapNotice(
      { reason: "unauthorized", message: "当前登录状态已经失效，请重新登录后再试。" },
      false,
    );

    expect(notice.text).toBe("当前登录状态已经失效，请重新登录后再试。");
    expect(notice.showLoginLink).toBe(true);
  });

  it("未登录且五问还没答完时不展示登录入口，避免打断收集", () => {
    const notice = resolveBootstrapNotice({ reason: "no_auth" }, false);

    expect(notice.showLoginLink).toBe(false);
    expect(notice.text).toContain("答案已经留在本页");
  });

  it("未登录但五问已答完时才提示登录，进入阶段 B", () => {
    const notice = resolveBootstrapNotice({ reason: "no_auth" }, true);

    expect(notice.showLoginLink).toBe(true);
    expect(notice.text).toContain("生成方案需要先登录");
  });
});

describe("buildInterviewBootstrapPlan", () => {
  it("用第一个答案建项目，其余答案按原顺序补写", () => {
    const plan = buildInterviewBootstrapPlan("想去厦门玩 3 天", [
      "预算 2500",
      "喜欢海边和美食",
      "不想太累",
    ]);

    expect(plan.rawInput).toBe("想去厦门玩 3 天");
    expect(plan.followUpAnswers).toEqual([
      "预算 2500",
      "喜欢海边和美食",
      "不想太累",
    ]);
  });

  it("没有第一个答案时不建项目", () => {
    expect(buildInterviewBootstrapPlan(null, ["预算 2500"])).toEqual({
      rawInput: null,
      followUpAnswers: [],
    });
  });

  it("过滤空白答案并去掉首尾空格", () => {
    const plan = buildInterviewBootstrapPlan("  想去厦门  ", ["  ", "预算 2500 "]);

    expect(plan.rawInput).toBe("想去厦门");
    expect(plan.followUpAnswers).toEqual(["预算 2500"]);
  });
});
