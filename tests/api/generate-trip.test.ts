import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGenerateTripHandler } from "../../app/api/generate-trip/route";
import { MockLLMProvider } from "../../lib/ai/mock";
import { generateTripResponseSchema } from "../../lib/trip/schema";
import { planTrip } from "../../lib/trip/planner";
import { AppError } from "../../lib/utils/errors";
import { MockWeatherProvider } from "../../lib/weather/mock";
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

function postJson(body: unknown): Request {
  return new Request("http://localhost/api/generate-trip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const mockPlanner = (input: unknown) =>
  planTrip(input, {
    llmProvider: new MockLLMProvider(),
    weatherProvider: new MockWeatherProvider({
      now: new Date("2026-07-02T00:00:00.000Z"),
    }),
  });

describe("POST /api/generate-trip", () => {
  it("返回通过正式 Schema 的 Mock 行程", async () => {
    const POST = createGenerateTripHandler(mockPlanner);
    const response = await POST(postJson({ tripRequest }));
    const payload = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(generateTripResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("携带 previousPlan 和 modificationRequest 时返回完整新方案与 appliedChanges", async () => {
    const POST = createGenerateTripHandler(mockPlanner);
    const originalResponse = await POST(postJson({ tripRequest }));
    const originalPayload = generateTripResponseSchema.parse(
      (await originalResponse.json()) as unknown,
    );
    const regeneratedResponse = await POST(
      postJson({
        tripRequest,
        previousPlan: originalPayload.tripPlan,
        modificationRequest: "第二天别太赶，晚上加一点自由活动。",
      }),
    );
    const regeneratedPayload = generateTripResponseSchema.parse(
      (await regeneratedResponse.json()) as unknown,
    );

    expect(regeneratedResponse.status).toBe(200);
    expect(regeneratedPayload.appliedChanges).toEqual([
      "第二天别太赶，晚上加一点自由活动。",
    ]);
    expect(regeneratedPayload.tripPlan.days).toBe(3);
  });

  it("非法请求返回统一 INVALID_INPUT", async () => {
    const POST = createGenerateTripHandler(mockPlanner);
    const response = await POST(
      postJson({
        tripRequest: {
          destinationCity: "厦门",
          days: 0,
        },
      }),
    );
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string };
    };

    expect(response.status).toBe(400);
    expect(payload.error?.code).toBe("INVALID_INPUT");
    expect(payload.error?.message).toBe(
      "旅行信息还没填完整，检查一下再试。",
    );
  });

  it("无效模型输出返回统一 AI_OUTPUT_INVALID 且不泄露细节", async () => {
    const POST = createGenerateTripHandler(async () => {
      throw new AppError(
        "AI_OUTPUT_INVALID",
        "模型刚刚没吐出合格格式，再试一次。",
      );
    });
    const response = await POST(postJson({ tripRequest }));
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };

    expect(response.status).toBe(502);
    expect(payload.error).toEqual({
      code: "AI_OUTPUT_INVALID",
      message: "模型刚刚没吐出合格格式，再试一次。",
    });
  });
});
