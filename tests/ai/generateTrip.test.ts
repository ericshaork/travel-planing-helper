import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateTripWithProvider } from "../../lib/ai/generateTrip";
import { MockLLMProvider } from "../../lib/ai/mock";
import type { LLMProvider } from "../../lib/ai/provider";
import type {
  GenerateTripOutput,
  ParseTripOutput,
  RegenerateTripOutput,
} from "../../lib/ai/types";
import { generateTripResponseSchema } from "../../lib/trip/schema";
import type {
  GenerateTripResponse,
  TripRequest,
} from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食", "拍照"],
  travelStyles: ["轻松"],
  mustVisitPlaces: ["鼓浪屿"],
  avoidPlaces: [],
};

async function createValidResponse(): Promise<GenerateTripResponse> {
  const mock = new MockLLMProvider();
  return generateTripResponseSchema.parse(
    await mock.generateTrip({ tripRequest }),
  );
}

class StubLLMProvider implements LLMProvider {
  readonly providerName = "stub";
  repairCalls = 0;

  constructor(
    private readonly output: GenerateTripOutput,
    private readonly repairResult: unknown,
  ) {}

  async parseTrip(): Promise<ParseTripOutput> {
    throw new Error("Not used in this test.");
  }

  async generateTrip(): Promise<GenerateTripOutput> {
    return this.output;
  }

  async regenerateTrip(): Promise<RegenerateTripOutput> {
    return this.output;
  }

  async repairJson<T>(): Promise<T> {
    this.repairCalls += 1;
    return this.repairResult as T;
  }
}

describe("generateTripWithProvider", () => {
  it("提取模型文本中的 JSON 并通过正式 Schema", async () => {
    const valid = await createValidResponse();
    const provider = new StubLLMProvider(
      `这里是结果：\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``,
      undefined,
    );

    const result = await generateTripWithProvider(
      { tripRequest },
      provider,
    );

    expect(generateTripResponseSchema.safeParse(result).success).toBe(true);
    expect(result.tripPlan.destination).toBe("厦门");
    expect(provider.repairCalls).toBe(0);
  });

  it("首次输出不合法时只调用一次 repairJson", async () => {
    const valid = await createValidResponse();
    const provider = new StubLLMProvider("not-json", valid);

    const result = await generateTripWithProvider(
      { tripRequest },
      provider,
    );

    expect(result.tripPlan.days).toBe(3);
    expect(provider.repairCalls).toBe(1);
  });

  it("修复后仍不合法时返回统一 AI_OUTPUT_INVALID", async () => {
    const provider = new StubLLMProvider("not-json", {
      tripPlan: { days: 3 },
    });

    await expect(
      generateTripWithProvider({ tripRequest }, provider),
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID",
      message: "模型刚刚没吐出合格格式，再试一次。",
    });
    expect(provider.repairCalls).toBe(1);
  });
});
