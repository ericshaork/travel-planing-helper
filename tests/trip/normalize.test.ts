import { describe, expect, it } from "vitest";

import {
  getMissingTripRequestFields,
  normalizeTripRequestDraft,
} from "../../lib/trip/normalize";
import type { TripRequestDraft } from "../../lib/trip/types";

const baseDraft: TripRequestDraft = {
  departureCity: "深圳",
  destinationCity: "厦门",
  budget: 2500,
  interests: ["海边", "美食"],
  travelStyles: ["轻松"],
};

describe("trip request normalization", () => {
  it("返回适合分步补充页使用的缺失字段和问题", () => {
    expect(
      getMissingTripRequestFields({
        destinationCity: "厦门",
      }),
    ).toEqual([
      { field: "departureCity", message: "你从哪个城市出发？" },
      { field: "budget", message: "大概预算是多少？" },
      { field: "interests", message: "你更喜欢哪些类型的体验？" },
      {
        field: "travelStyles",
        message: "你希望行程轻松一点，还是高效率一点？",
      },
      {
        field: "daysOrDates",
        message: "准备玩几天，或者具体哪几天？",
      },
    ]);
  });

  it("单独识别缺少目的地城市", () => {
    expect(
      getMissingTripRequestFields({
        ...baseDraft,
        destinationCity: undefined,
        days: 3,
      }),
    ).toEqual([
      { field: "destinationCity", message: "你想去哪个城市？" },
    ]);
  });

  it("只有开始日期时提示补充结束日期或天数", () => {
    expect(
      getMissingTripRequestFields({
        ...baseDraft,
        startDate: "2026-07-10",
      }),
    ).toContainEqual({
      field: "endDate",
      message: "再补一个结束日期，或者直接告诉我准备玩几天。",
    });
  });

  it("只有结束日期时提示补充开始日期或天数", () => {
    expect(
      getMissingTripRequestFields({
        ...baseDraft,
        endDate: "2026-07-12",
      }),
    ).toContainEqual({
      field: "startDate",
      message: "再补一个开始日期，或者直接告诉我准备玩几天。",
    });
  });

  it("根据完整日期区间计算包含首尾日期的天数", () => {
    const result = normalizeTripRequestDraft({
      ...baseDraft,
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.tripRequest.days).toBe(3);
    }
  });

  it("允许只有天数而没有具体日期的通用方案", () => {
    const result = normalizeTripRequestDraft({
      ...baseDraft,
      days: 3,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.tripRequest).toMatchObject({
        days: 3,
        currency: "CNY",
        mustVisitPlaces: [],
        avoidPlaces: [],
      });
      expect(result.tripRequest.startDate).toBeUndefined();
      expect(result.tripRequest.endDate).toBeUndefined();
    }
  });

  it("补齐默认币种、空地点数组和未填写的可选偏好", () => {
    const result = normalizeTripRequestDraft({
      ...baseDraft,
      days: 2,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.tripRequest.currency).toBe("CNY");
      expect(result.tripRequest.mustVisitPlaces).toEqual([]);
      expect(result.tripRequest.avoidPlaces).toEqual([]);
      expect(result.tripRequest.accommodationPreference).toBeUndefined();
      expect(result.tripRequest.localTransportPreference).toBeUndefined();
      expect(result.tripRequest.schedulePreference).toBeUndefined();
      expect(result.tripRequest.specialRequirements).toBeUndefined();
    }
  });

  it("拒绝与日期区间不一致的显式天数", () => {
    const result = normalizeTripRequestDraft({
      ...baseDraft,
      startDate: "2026-07-10",
      endDate: "2026-07-12",
      days: 2,
    });

    expect(result).toMatchObject({
      success: false,
      missingFields: [],
      issues: [
        {
          field: "days",
          message: "天数应与日期区间一致，共 3 天",
        },
      ],
    });
  });

  it("返回日期区间错误而不是生成无效请求", () => {
    const result = normalizeTripRequestDraft({
      ...baseDraft,
      startDate: "2026-07-12",
      endDate: "2026-07-10",
    });

    expect(result).toMatchObject({
      success: false,
      missingFields: [],
      issues: [
        {
          field: "endDate",
          message: "结束日期不能早于开始日期，请重新选择出行日期。",
        },
      ],
    });
  });
});
