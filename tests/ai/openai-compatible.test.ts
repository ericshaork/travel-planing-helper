import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import {
  extractJsonObject,
  OpenAICompatibleProvider,
} from "../../lib/ai/openai-compatible";
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
  it("通过配置的 baseURL、apiKey 和 model 调用 chat/completions", async () => {
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
  });

  it("可以从代码围栏和前后说明中提取 JSON", () => {
    expect(
      extractJsonObject('说明文字\n```json\n{"ok":true}\n```\n结束'),
    ).toEqual({ ok: true });
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

  it("第三方请求错误不会暴露响应和密钥", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://compatible.example.test/v1",
      apiKey: "do-not-leak",
      model: "config-model",
      fetcher: async () => completion("upstream secret detail", 500),
    });

    await expect(provider.generateTrip({ tripRequest })).rejects.toMatchObject({
      code: "AI_GENERATION_FAILED",
      message: "模型这次没有顺利返回结果，请稍后再试。",
    });
  });
});
