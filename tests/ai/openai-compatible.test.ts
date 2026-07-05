import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import {
  extractJsonObject,
  OpenAICompatibleProvider,
  resolveChatCompletionsEndpoint,
} from "../../lib/ai/openai-compatible";
import { parseTripResponseSchema } from "../../lib/trip/schema";
import type { TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const parseTripPayload = {
  parsed: {
    departureCity: "深圳",
    destinationCity: "厦门",
    days: 3,
    budget: 2500,
    interests: ["海边", "美食"],
    travelStyles: ["轻松"],
  },
  missingFields: [],
  followUpQuestions: [],
};

function completion(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("OpenAICompatibleProvider", () => {
  it("会把 baseUrl 规范化为 chat/completions", () => {
    expect(
      resolveChatCompletionsEndpoint(
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
      ).toString(),
    ).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
  });

  it("已经带 chat/completions 的 baseUrl 不会重复拼接", () => {
    expect(
      resolveChatCompletionsEndpoint(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      ).toString(),
    ).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
  });

  it("通过配置的 baseUrl、apiKey 和 model 调用 chat/completions", async () => {
    const requests: Array<{
      url: string;
      authorization: string | null;
      body: Record<string, unknown>;
    }> = [];
    const fetcher = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        requests.push({
          url: String(input),
          authorization: new Headers(init?.headers).get("Authorization"),
          body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        });
        return completion('{"tripPlan":{"placeholder":true}}');
      },
    );
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1/",
      apiKey: "private-test-key",
      model: "config-model",
      fetcher,
    });

    const output = await provider.generateTrip({ tripRequest });

    expect(output).toBe('{"tripPlan":{"placeholder":true}}');
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://compatible.example.test/v1/chat/completions",
    );
    expect(requests[0]?.authorization).toBe("Bearer private-test-key");
    expect(requests[0]?.body.model).toBe("config-model");
    expect(requests[0]?.body.messages).toBeInstanceOf(Array);
    expect(requests[0]?.body.max_tokens).toBe(8000);
  });

  it("可以从代码围栏和前后说明中提取 JSON", () => {
    expect(
      extractJsonObject('说明文字\n```json\n{"ok":true}\n```\n结束'),
    ).toEqual({ ok: true });
  });

  it("parseTrip 能解析纯 JSON", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () => completion(JSON.stringify(parseTripPayload)),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual(parseTripResponseSchema.parse(parseTripPayload));
  });

  it("parseTrip 能解析 json 代码块", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () =>
        completion(`\`\`\`json\n${JSON.stringify(parseTripPayload)}\n\`\`\``),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual(parseTripResponseSchema.parse(parseTripPayload));
  });

  it("parseTrip 能解析前后带说明文字的 JSON", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () =>
        completion(`这是解析结果：\n${JSON.stringify(parseTripPayload)}\n请查收`),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual(parseTripResponseSchema.parse(parseTripPayload));
  });

  it("parseTrip 能解析 data 包裹的 JSON", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () =>
        completion(JSON.stringify({ data: parseTripPayload })),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual(parseTripResponseSchema.parse(parseTripPayload));
  });

  it("parseTrip 能解析 result 包裹的 JSON", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () =>
        completion(JSON.stringify({ result: parseTripPayload })),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual(parseTripResponseSchema.parse(parseTripPayload));
  });

  it("parseTrip 会清掉不完整 startDate，让首页示例 1 可通过", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () =>
        completion(
          JSON.stringify({
            parsed: {
              departureCity: "深圳",
              destinationCity: "厦门",
              startDate: "7月",
              days: 3,
              budget: 2500,
              interests: ["海边", "美食", "拍照"],
              travelStyles: ["轻松"],
            },
            missingFields: [],
            followUpQuestions: [],
          }),
        ),
    });

    await expect(
      provider.parseTrip({ text: "7 月从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual({
      parsed: {
        departureCity: "深圳",
        destinationCity: "厦门",
        days: 3,
        budget: 2500,
        interests: ["海边", "美食", "拍照"],
        travelStyles: ["轻松"],
      },
      missingFields: [],
      followUpQuestions: [],
    });
  });

  it("parseTrip 首次 schema 失败时会调用一次 repair", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const fetcher = vi.fn().mockImplementation(async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);

      if (requests.length === 1) {
        return completion(
          JSON.stringify({
            parsed: {
              departureCity: "深圳",
              destinationCity: "厦门",
              endDate: "2026-07-06",
            },
          }),
        );
      }

      return completion(JSON.stringify(parseTripPayload));
    });

    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher,
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).resolves.toEqual(parseTripResponseSchema.parse(parseTripPayload));

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(requests[1]?.messages ?? [])).toContain(
      "TripRequestDraft",
    );
  });

  it("parseTrip 在不可修复的非 JSON 情况下返回明确错误", async () => {
    const responses = [completion("这不是 JSON"), completion("还是不是 JSON")];

    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () => responses.shift() ?? completion("still bad"),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID",
      message: "模型解析结果不是合法 JSON，请再试一次。",
    });
  });

  it("parseTrip 在可提取但 schema 不通过且 repair 失败时返回字段错误", async () => {
    const responses = [
      completion(
        JSON.stringify({
          parsed: {
            departureCity: "深圳",
            destinationCity: "厦门",
            endDate: "2026-07-06",
          },
        }),
      ),
      completion("still bad"),
    ];

    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "qwen-plus",
      fetcher: async () => responses.shift() ?? completion("still bad"),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID",
      message: "模型返回字段不符合预期，请再试一次。",
    });
  });

  it("schema 失败时日志包含 issues 摘要，且不包含 API Key", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const responses = [
      completion(
        JSON.stringify({
          parsed: {
            departureCity: "深圳",
            destinationCity: "厦门",
            endDate: "2026-07-06",
          },
        }),
      ),
      completion("still bad"),
    ];
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "super-secret-key",
      model: "qwen-plus",
      fetcher: async () => responses.shift() ?? completion("still bad"),
    });

    await expect(
      provider.parseTrip({ text: "我想从深圳去厦门玩 3 天，预算 2500。" }),
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID",
    });

    const calls = consoleError.mock.calls
      .filter((call) => call[0] === "[parse-trip] provider diagnostics")
      .map((call) => JSON.stringify(call[1]));
    const merged = calls.join("\n");

    expect(merged).toContain("schemaIssues");
    expect(merged).toContain("parsedFieldTypes");
    expect(merged).toContain("endDate");
    expect(merged).not.toContain("super-secret-key");

    consoleError.mockRestore();
  });

  it("repairJson 使用目标 Schema 校验修复结果", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "private-test-key",
      model: "config-model",
      fetcher: async () => completion('```json\n{"ok":true}\n```'),
    });
    const schema = z.object({ ok: z.literal(true) });

    await expect(
      provider.repairJson({
        rawOutput: "bad-json",
        targetSchema: schema,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("401 会提示检查 LLM_API_KEY", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "bad-key",
      model: "config-model",
      fetcher: async () => completion("unauthorized", 401),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "真实模型鉴权失败，请检查 LLM_API_KEY 是否正确。",
    });
  });

  it("403 会提示权限不足", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "test-key",
      model: "config-model",
      fetcher: async () => completion("forbidden", 403),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "真实模型没有调用权限，请检查账号、模型权限或 API Key。",
    });
  });

  it("404 会提示 Base URL 或模型名可能不对", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "test-key",
      model: "config-model",
      fetcher: async () => completion("not found", 404),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "真实模型接口不存在，请检查 LLM_BASE_URL 或 LLM_MODEL 是否正确。",
    });
  });

  it("429 会提示检查额度或稍后再试", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "test-key",
      model: "config-model",
      fetcher: async () => completion("rate limited", 429),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "真实模型当前请求过多，请检查额度或稍后再试。",
    });
  });

  it("5xx 会提示服务暂时不可用", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "do-not-leak",
      model: "config-model",
      fetcher: async () => completion("upstream secret detail", 500),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "真实模型服务暂时不可用（HTTP 500），请稍后再试。",
    });
  });

  it("超时会提示请求超时", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "test-key",
      model: "config-model",
      timeoutMs: 5,
      fetcher: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "真实模型请求超时（>0 秒），请稍后再试。",
    });
  });

  it("上游返回非兼容 JSON 结构时给出清晰错误", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "test-key",
      model: "config-model",
      fetcher: async () =>
        new Response(JSON.stringify({ unexpected: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message:
        "真实模型返回结构不符合 OpenAI-compatible 预期，请检查模型或 Base URL。",
    });
  });
});
