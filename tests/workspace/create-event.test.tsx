import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceEventCreatePanel } from "../../components/trip/WorkspaceEventCreatePanel";
import { WorkspaceEventEditor } from "../../components/trip/WorkspaceEventEditor";
import {
  applyWorkspaceItineraryItemUpdate,
  createWorkspaceEventInputFromPoiCandidate,
  createWorkspaceItineraryItem,
  formatWorkspaceEventTimeLabel,
  parseWorkspaceEventTimeLabel,
  normalizeWorkspaceCreateEventInput,
} from "../../lib/trip/workspace-events";
import {
  loadTripPlan,
  saveTripPlan,
  type StorageLike,
} from "../../lib/trip/storage";
import type { TimeSlotView } from "../../lib/trip/itinerary-view";
import type { TripPlan } from "../../lib/trip/types";

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

const morningSlot: TimeSlotView = {
  id: "morning",
  key: "morning",
  label: "06:00-12:00",
  startTime: "06:00",
  endTime: "12:00",
  items: [],
  isEmpty: true,
};

function createPlanWithItem(): TripPlan {
  const item = createWorkspaceItineraryItem({
    event: {
      placeName: "苏堤",
      type: "attraction",
      timeLabel: "09:30-11:00",
      note: "慢慢走，留一点拍照时间。",
    },
    editorId: "item-test-1",
    editorSlotId: "morning",
  });

  if (!item) {
    throw new Error("Expected a valid itinerary item.");
  }

  return {
    tripTitle: "空白旅行",
    summary: "先放入第一站。",
    destination: "杭州",
    days: 1,
    travelStyleSummary: "轻松一点",
    weatherSummary: {
      available: false,
      overview: "暂时还没有天气信息。",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "测试数据",
    },
    budgetSummary: {
      totalEstimate: "待补充",
      transport: "待补充",
      hotel: "待补充",
      food: "待补充",
      tickets: "待补充",
      localTransport: "待补充",
      flexibleSpending: "待补充",
      note: "测试数据",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "待补充",
      options: [
        {
          mode: "other",
          pros: ["先记录"],
          cons: ["还没确认"],
          recommendation: "后续再补交通建议。",
        },
      ],
      suggestedPlatforms: [],
      note: "测试数据",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "第 1 天",
        routeOrder: ["苏堤"],
        routeReason: "先记录第一站。",
        morning: [item],
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

describe("Workspace create event", () => {
  it("keeps itinerary blocks as display blocks instead of inline editor hosts", () => {
    const source = readFileSync("components/trip/ItineraryBlock.tsx", "utf8");

    expect(source).not.toContain("WorkspaceEventEditor");
    expect(source).not.toContain("scrollIntoView");
    expect(source).not.toContain("isEditing");
  });

  it("renders left-side creation as a place search flow first", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceEventCreatePanel
        searchCity="北京"
        slot={morningSlot}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain('data-testid="workspace-place-search-panel"');
    expect(markup).toContain("搜索地点");
    expect(markup).toContain("在北京搜索地点");
    expect(markup).toContain("搜不到，手动填写");
    expect(markup).not.toContain('data-testid="workspace-event-editor"');
  });

  it("normalizes form input into a real ItineraryItem instead of a placeholder", () => {
    const item = createWorkspaceItineraryItem({
      event: {
        placeName: " 苏堤 ",
        type: "attraction",
        timeLabel: " 09:30-11:00 ",
        note: " 慢慢走，留一点拍照时间。 ",
      },
      editorId: "item-test-1",
      editorSlotId: "morning",
    });

    expect(item).toEqual({
      placeName: "苏堤",
      type: "attraction",
      timeLabel: "09:30-11:00",
      reason: "慢慢走，留一点拍照时间。",
      guide: ["慢慢走，留一点拍照时间。"],
      editorId: "item-test-1",
      editorSlotId: "morning",
    });
    expect(item?.placeName).not.toContain("未命名地点");
  });

  it("rejects blank place names before creating an ItineraryItem", () => {
    expect(
      normalizeWorkspaceCreateEventInput({
        placeName: "   ",
        type: "other",
        timeLabel: "10:00-11:00",
      }),
    ).toBeNull();
  });

  it("parses and formats editor time ranges with 30 minute options", () => {
    expect(parseWorkspaceEventTimeLabel("10:30-12:00")).toEqual({
      startTime: "10:30",
      endTime: "12:00",
    });
    expect(formatWorkspaceEventTimeLabel("11:00", "13:00")).toBe("11:00-13:00");
  });

  it("normalizes POI candidates into the same WorkspaceCreateEventInput", () => {
    const input = createWorkspaceEventInputFromPoiCandidate({
      candidate: {
        id: "poi-palace",
        name: "故宫",
        address: "北京市东城区景山前街4号",
        city: "北京",
        coordinates: { lat: 39.9163, lng: 116.3972 },
        confidence: 0.98,
        provider: "mock",
      },
      timeLabel: "09:00-11:00",
    });

    expect(input).toMatchObject({
      placeName: "故宫",
      type: "attraction",
      timeLabel: "09:00-11:00",
      note: "参考位置：北京市东城区景山前街4号",
    });
    expect(input.sourceCandidate?.coordinates).toEqual({
      lat: 39.9163,
      lng: 116.3972,
    });
  });

  it("renders edit flow through the shared Event Editor", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceEventEditor
        initialValue={{
          placeName: "酒店",
          type: "hotel",
          timeLabel: "10:30-12:00",
          reason: "靠近地铁站",
        }}
        mode="edit"
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(markup).toContain('data-testid="workspace-event-editor"');
    expect(markup).toContain("酒店");
    expect(markup).toContain('value="10:30"');
    expect(markup).toContain('value="12:00"');
    expect(markup).toContain("靠近地铁站");
    expect(markup).toContain("删除");
    expect(markup).not.toContain("overflow-y-auto");
    expect(markup).not.toContain("max-h-");
  });

  it("keeps created events and timeSlots in the existing TripPlan storage shape", () => {
    const storage = new MemoryStorage();
    const plan = createPlanWithItem();

    saveTripPlan(plan, storage);

    const restored = loadTripPlan(storage);
    const restoredDay = restored?.dailyItinerary[0];

    expect(restoredDay?.timeSlots?.[0]).toMatchObject({
      id: "morning",
      label: "06:00-12:00",
    });
    expect(restoredDay?.morning[0]).toMatchObject({
      placeName: "苏堤",
      type: "attraction",
      timeLabel: "09:30-11:00",
      editorSlotId: "morning",
    });
  });

  it("updates a newly created event as the same ItineraryItem and survives storage restore", () => {
    const storage = new MemoryStorage();
    const plan = createPlanWithItem();
    const originalItem = plan.dailyItinerary[0]!.morning[0]!;
    const updatedItem = applyWorkspaceItineraryItemUpdate(originalItem, {
      placeName: "欢乐谷摩天轮",
      type: "attraction",
      timeLabel: "20:00",
      reason: "晚上灯光很好看",
    });

    expect(updatedItem).toMatchObject({
      placeName: "欢乐谷摩天轮",
      type: "attraction",
      timeLabel: "20:00",
      reason: "晚上灯光很好看",
      editorId: "item-test-1",
      editorSlotId: "morning",
    });

    const updatedPlan: TripPlan = {
      ...plan,
      dailyItinerary: [
        {
          ...plan.dailyItinerary[0]!,
          routeOrder: ["欢乐谷摩天轮"],
          morning: [updatedItem!],
        },
      ],
    };

    saveTripPlan(updatedPlan, storage);

    const restored = loadTripPlan(storage);
    expect(restored?.dailyItinerary[0]?.morning[0]).toMatchObject({
      placeName: "欢乐谷摩天轮",
      type: "attraction",
      timeLabel: "20:00",
      reason: "晚上灯光很好看",
      editorSlotId: "morning",
    });
  });
});
