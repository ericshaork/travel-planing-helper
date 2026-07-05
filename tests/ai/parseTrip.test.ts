import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockLLMProvider } from "../../lib/ai/mock";
import {
  normalizeParseTripResponseCandidate,
  normalizeTripRequestDraftCandidate,
} from "../../lib/ai/parse-trip-normalize";
import { parseTrip } from "../../lib/ai/parseTrip";
import { PARSE_TRIP_SYSTEM_PROMPT } from "../../lib/ai/prompts";
import type { LLMProvider } from "../../lib/ai/provider";
import type {
  GenerateTripOutput,
  ParseTripOutput,
  RegenerateTripOutput,
} from "../../lib/ai/types";

const HOMEPAGE_EXAMPLES = [
  "7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。",
  "从广州去成都玩 4 天，喜欢美食和城市漫步，不想去太商业化的景点。",
  "想去杭州玩两天，预算 1500，不想早起，想轻松一点。",
] as const;

class BrokenParseProvider implements LLMProvider {
  readonly providerName = "broken-parse";

  async parseTrip(): Promise<ParseTripOutput> {
    return null as unknown as ParseTripOutput;
  }

  async generateTrip(): Promise<GenerateTripOutput> {
    throw new Error("Not used.");
  }

  async regenerateTrip(): Promise<RegenerateTripOutput> {
    throw new Error("Not used.");
  }

  async repairJson<T>(): Promise<T> {
    throw new Error("Not used.");
  }
}

describe("parseTrip", () => {
  it("Mock parse 不受影响", async () => {
    const result = await parseTrip(
      {
        text: HOMEPAGE_EXAMPLES[2],
      },
      new MockLLMProvider(),
    );

    expect(result.parsed.days).toBe(2);
    expect(result.parsed.budget).toBe(1500);
    expect(result.parsed.travelStyles).toContain("轻松");
    expect(result.missingFields).toBeInstanceOf(Array);
    expect(result.followUpQuestions).toBeInstanceOf(Array);
  });

  it("provider 返回不合格结构时给出字段不符合预期错误", async () => {
    await expect(
      parseTrip(
        {
          text: HOMEPAGE_EXAMPLES[2],
        },
        new BrokenParseProvider(),
      ),
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID",
      message: "模型返回字段不符合预期，请再试一次。",
    });
  });
});

describe("parse-trip normalization", () => {
  it('startDate="7月" + days=3，清洗后可通过', () => {
    expect(
      normalizeParseTripResponseCandidate({
        parsed: {
          departureCity: "深圳",
          destinationCity: "厦门",
          startDate: "7月",
          days: 3,
        },
        missingFields: [],
        followUpQuestions: [],
      }),
    ).toEqual({
      parsed: {
        departureCity: "深圳",
        destinationCity: "厦门",
        days: 3,
      },
      missingFields: [],
      followUpQuestions: [],
    });
  });

  it('startDate="7 月" + days=3，清洗后可通过', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        startDate: "7 月",
        days: 3,
      }),
    ).toEqual({
      days: 3,
    });
  });

  it('startDate="2026-07" + days=3，清洗后可通过', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        startDate: "2026-07",
        days: 3,
      }),
    ).toEqual({
      days: 3,
    });
  });

  it('startDate="明天" + days=3，清洗后可通过', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        startDate: "明天",
        days: 3,
      }),
    ).toEqual({
      days: 3,
    });
  });

  it('startDate="" + days=3，清洗后可通过', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        startDate: "",
        days: 3,
      }),
    ).toEqual({
      days: 3,
    });
  });

  it('合法 startDate="2026-07-04" 应保留', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        startDate: "2026-07-04",
        days: 3,
      }),
    ).toEqual({
      startDate: "2026-07-04",
      days: 3,
    });
  });

  it("非法 endDate 同样删除", () => {
    expect(
      normalizeTripRequestDraftCandidate({
        startDate: "2026-07-04",
        endDate: "暑假",
        days: 3,
      }),
    ).toEqual({
      startDate: "2026-07-04",
      days: 3,
    });
  });

  it("首页示例 1 对应模型输出包含 startDate=7月 时仍可通过", () => {
    expect(
      normalizeParseTripResponseCandidate({
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
    ).toEqual({
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

  it("首页三个示例都纳入测试覆盖", () => {
    expect(HOMEPAGE_EXAMPLES).toHaveLength(3);
    expect(HOMEPAGE_EXAMPLES[0]).toContain("7 月从深圳去厦门玩 3 天");
    expect(HOMEPAGE_EXAMPLES[1]).toContain("从广州去成都玩 4 天");
    expect(HOMEPAGE_EXAMPLES[2]).toContain("想去杭州玩两天");
  });

  it("中文 key 或近似 key 会被归一化", () => {
    expect(
      normalizeTripRequestDraftCandidate({
        出发城市: "深圳",
        目的地: "厦门",
        天数: "3天",
        预算: "2500元",
        兴趣: "美食,海边,拍照",
        风格: "轻松",
      }),
    ).toEqual({
      departureCity: "深圳",
      destinationCity: "厦门",
      days: 3,
      budget: 2500,
      interests: ["美食", "海边", "拍照"],
      travelStyles: ["轻松"],
    });
  });

  it("from/to/duration/totalBudget/preferences/styles 会被映射", () => {
    expect(
      normalizeTripRequestDraftCandidate({
        from: "深圳",
        to: "厦门",
        duration: "3",
        totalBudget: "2500",
        preferences: "美食,海边,拍照",
        styles: "轻松",
      }),
    ).toEqual({
      departureCity: "深圳",
      destinationCity: "厦门",
      days: 3,
      budget: 2500,
      interests: ["美食", "海边", "拍照"],
      travelStyles: ["轻松"],
    });
  });

  it('days="3天" 可转 number', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        days: "3天",
      }),
    ).toEqual({
      days: 3,
    });
  });

  it('budget="2500元" 可转 number', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        budget: "2500元",
      }),
    ).toEqual({
      budget: 2500,
    });
  });

  it('interests="美食,海边,拍照" 可转数组', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        interests: "美食,海边,拍照",
      }),
    ).toEqual({
      interests: ["美食", "海边", "拍照"],
    });
  });

  it('travelStyles="轻松" 可转数组', () => {
    expect(
      normalizeTripRequestDraftCandidate({
        travelStyles: "轻松",
      }),
    ).toEqual({
      travelStyles: ["轻松"],
    });
  });

  it("整段 parse-trip response 会被轻量归一化", () => {
    expect(
      normalizeParseTripResponseCandidate({
        parsed: {
          origin: "深圳",
          destination: "厦门",
          travelDays: "4 天",
          budgetCny: "预算2500",
          interest: "美食,海边",
          pace: "轻松",
          startDate: "下周",
        },
        missing: "startDate,endDate",
        questions: "你什么时候出发？",
      }),
    ).toEqual({
      parsed: {
        departureCity: "深圳",
        destinationCity: "厦门",
        days: 4,
        budget: 2500,
        interests: ["美食", "海边"],
        travelStyles: ["轻松"],
      },
      missingFields: ["startDate", "endDate"],
      followUpQuestions: ["你什么时候出发？"],
    });
  });
});

describe("parse-trip prompt contract", () => {
  it("prompt 明确不完整日期不能写进 startDate/endDate", () => {
    expect(PARSE_TRIP_SYSTEM_PROMPT).toContain("只有用户提供完整年月日时");
    expect(PARSE_TRIP_SYSTEM_PROMPT).toContain("不要猜测具体日期");
    expect(PARSE_TRIP_SYSTEM_PROMPT).toContain("不要补年份");
  });
});
