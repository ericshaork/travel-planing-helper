import { describe, expect, it } from "vitest";

import { appendWorkspaceDay } from "../../hooks/useTripWorkspaceState";
import { saveTripPlan } from "../../lib/trip/storage";
import type { TripPlan } from "../../lib/trip/types";

function createSamplePlan(): TripPlan {
  return {
    tripTitle: "北京 2 天慢慢走",
    summary: "先有两天行程，方便验证新增一天。",
    destination: "北京",
    days: 2,
    travelStyleSummary: "城市散步",
    weatherSummary: {
      available: false,
      overview: "暂不包含天气。",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "test",
    },
    budgetSummary: {
      totalEstimate: "待补充",
      transport: "待补充",
      hotel: "待补充",
      food: "待补充",
      tickets: "待补充",
      localTransport: "待补充",
      flexibleSpending: "待补充",
      note: "test",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "test",
      options: [
        {
          mode: "other",
          pros: ["test"],
          cons: ["test"],
          recommendation: "test",
        },
      ],
      suggestedPlatforms: [],
      note: "test",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "第 1 天",
        routeOrder: ["故宫"],
        routeReason: "第一天先走核心城区。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
        timeSlots: [
          {
            id: "morning",
            baseSlot: "morning",
            label: "06:00-12:00",
            startTime: "06:00",
            endTime: "12:00",
          },
          {
            id: "afternoon",
            baseSlot: "afternoon",
            label: "12:00-18:00",
            startTime: "12:00",
            endTime: "18:00",
          },
          {
            id: "evening",
            baseSlot: "evening",
            label: "18:00-24:00",
            startTime: "18:00",
            endTime: "24:00",
          },
        ],
      },
      {
        day: 2,
        theme: "第 2 天",
        routeOrder: ["颐和园"],
        routeReason: "第二天走远一点。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
        timeSlots: [
          {
            id: "morning",
            baseSlot: "morning",
            label: "06:00-12:00",
            startTime: "06:00",
            endTime: "12:00",
          },
          {
            id: "afternoon",
            baseSlot: "afternoon",
            label: "12:00-18:00",
            startTime: "12:00",
            endTime: "18:00",
          },
          {
            id: "evening",
            baseSlot: "evening",
            label: "18:00-24:00",
            startTime: "18:00",
            endTime: "24:00",
          },
        ],
      },
    ],
    generalTips: [],
    warnings: [],
  };
}

describe("appendWorkspaceDay", () => {
  it("appends a blank editable day with default time slots", () => {
    const originalPlan = createSamplePlan();

    const { nextDayNumber, nextTripPlan } = appendWorkspaceDay(originalPlan);

    expect(nextDayNumber).toBe(3);
    expect(nextTripPlan.days).toBe(3);
    expect(nextTripPlan.dailyItinerary).toHaveLength(3);
    expect(nextTripPlan.dailyItinerary[0]).toEqual(originalPlan.dailyItinerary[0]);
    expect(nextTripPlan.dailyItinerary[1]).toEqual(originalPlan.dailyItinerary[1]);
    expect(nextTripPlan.dailyItinerary[2]).toMatchObject({
      day: 3,
      theme: "第 3 天",
      routeOrder: ["待补充地点"],
      morning: [],
      afternoon: [],
      evening: [],
      timeSlots: [
        {
          id: "morning",
          baseSlot: "morning",
          label: "上午",
          startTime: "08:00",
          endTime: "12:00",
        },
        {
          id: "afternoon",
          baseSlot: "afternoon",
          label: "下午",
          startTime: "12:00",
          endTime: "18:00",
        },
        {
          id: "evening",
          baseSlot: "evening",
          label: "晚上",
          startTime: "18:00",
          endTime: "22:00",
        },
      ],
    });
    expect(saveTripPlan(nextTripPlan)).toMatchObject({
      days: 3,
    });
  });
});
