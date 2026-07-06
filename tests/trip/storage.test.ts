import { describe, expect, it } from "vitest";

import {
  loadParsedTripSession,
  loadTripRequest,
  loadTripRequestDraft,
  PARSED_TRIP_STORAGE_KEY,
  saveParsedTripSession,
  saveTripRequest,
  saveTripRequestDraft,
  TRIP_DRAFT_STORAGE_KEY,
  TRIP_REQUEST_STORAGE_KEY,
} from "../../lib/trip/storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const parseResult = {
  parsed: {
    departureCity: "深圳",
    destinationCity: "厦门",
    days: 3,
    budget: 2500,
    interests: ["海边"],
    travelStyles: ["轻松"],
  },
  missingFields: [],
  followUpQuestions: [],
};

describe("parsed trip storage", () => {
  it("没有首页解析或补充草稿时返回空状态", () => {
    const storage = new MemoryStorage();

    expect(loadParsedTripSession(storage)).toBeNull();
    expect(loadTripRequestDraft(storage)).toBeNull();
  });

  it("保存并恢复首页解析会话", () => {
    const storage = new MemoryStorage();

    saveParsedTripSession(
      {
        rawInput: "从深圳去厦门玩 3 天",
        selectedInterests: ["海边"],
        selectedTravelStyles: ["轻松"],
        parseResult,
      },
      storage,
    );

    expect(loadParsedTripSession(storage)).toMatchObject({
      rawInput: "从深圳去厦门玩 3 天",
      selectedInterests: ["海边"],
      selectedTravelStyles: ["轻松"],
      parseResult,
    });
  });

  it("损坏的浏览器数据不会进入后续页面", () => {
    const storage = new MemoryStorage();
    storage.setItem(PARSED_TRIP_STORAGE_KEY, "{bad-json");

    expect(loadParsedTripSession(storage)).toBeNull();
    expect(storage.getItem(PARSED_TRIP_STORAGE_KEY)).toBeNull();
  });

  it("保存并恢复分步补充页的旅行草稿", () => {
    const storage = new MemoryStorage();
    const draft = {
      ...parseResult.parsed,
      mustVisitPlaces: ["鼓浪屿"],
      accommodationPreference: "交通方便",
    };

    expect(saveTripRequestDraft(draft, storage)).toBe(true);
    expect(loadTripRequestDraft(storage)).toEqual(draft);
  });

  it("保存并恢复标准化后的完整 TripRequest", () => {
    const storage = new MemoryStorage();
    const tripRequest = {
      departureCity: "深圳",
      destinationCity: "厦门",
      days: 3,
      budget: 2500,
      currency: "CNY",
      interests: ["海边"],
      travelStyles: ["轻松"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    };

    saveTripRequest(tripRequest, storage);
    expect(loadTripRequest(storage)).toEqual(tripRequest);
  });

  it("新的首页解析会清理旧草稿和旧完整请求", () => {
    const storage = new MemoryStorage();
    storage.setItem(TRIP_DRAFT_STORAGE_KEY, JSON.stringify({ days: 2 }));
    storage.setItem(TRIP_REQUEST_STORAGE_KEY, JSON.stringify({ days: 2 }));

    saveParsedTripSession(
      {
        rawInput: "从深圳去厦门玩 3 天",
        selectedInterests: ["海边"],
        selectedTravelStyles: ["轻松"],
        parseResult,
      },
      storage,
    );

    expect(storage.getItem(TRIP_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(TRIP_REQUEST_STORAGE_KEY)).toBeNull();
  });
  it("trip draft 和 trip request 各自存储，不会互相覆盖", () => {
    const storage = new MemoryStorage();
    const draft = {
      departureCity: "深圳",
      destinationCity: "厦门",
      days: 4,
      budget: 3000,
      interests: ["海边"],
      travelStyles: ["轻松"],
    };
    const tripRequest = {
      departureCity: "深圳",
      destinationCity: "厦门",
      startDate: "2026-07-10",
      endDate: "2026-07-13",
      days: 4,
      budget: 3000,
      currency: "CNY",
      interests: ["海边"],
      travelStyles: ["轻松"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    };

    expect(saveTripRequestDraft(draft, storage)).toBe(true);
    saveTripRequest(tripRequest, storage);

    expect(loadTripRequestDraft(storage)).toEqual(draft);
    expect(loadTripRequest(storage)).toEqual(tripRequest);
  });
});
