import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "../../app/api/parse-trip/route";
import { parseTripResponseSchema } from "../../lib/trip/schema";

function postJson(body: unknown): Request {
  return new Request("http://localhost/api/parse-trip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/parse-trip", () => {
  it("通过 LLMProvider 返回符合 Schema 的 Mock 解析结果", async () => {
    const response = await POST(
      postJson({
        text: "从深圳去厦门玩 3 天，预算 2500，喜欢海边和美食，想轻松一点。",
      }),
    );
    const payload = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(parseTripResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("输入过长时返回统一且友好的错误", async () => {
    const response = await POST(
      postJson({
        text: "去厦门".repeat(701),
      }),
    );
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string };
    };

    expect(response.status).toBe(400);
    expect(payload.error?.code).toBe("INVALID_INPUT");
    expect(payload.error?.message).toBe(
      "这段旅行需求还没法解析，检查一下内容和长度再试试。",
    );
  });
});
