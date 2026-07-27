import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  DayCabinet,
  EditEmptyCabinet,
  getCabinetDividerPercents,
  insertCabinetDividerPercent,
  removeCabinetDividerPercent,
  resolveDayDividerPositions,
  updateDayDividerOverrides,
  updateCabinetDividerPercentsAtIndex,
} from "../../components/trip/DayCabinet";
import { ItineraryBlock } from "../../components/trip/ItineraryBlock";
import { DesktopWorkspaceShell } from "../../components/workspace/DesktopWorkspaceShell";
import { ModificationPanel } from "../../components/workspace/ModificationPanel";
import { TripEditor } from "../../components/workspace/TripEditor";
import { shouldUseCompactBlankEditMode } from "../../components/workspace/TripWorkspace";
import type { DayCabinetView } from "../../lib/trip/itinerary-view";
import { getItineraryBlockId } from "../../lib/trip/map-point-match";
import type { DailyTimeSlot, TripPlan } from "../../lib/trip/types";

const defaultTimeSlots: DailyTimeSlot[] = [
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
];

const emptyCabinet: DayCabinetView = {
  dayNumber: 1,
  date: undefined,
  theme: "空白计划",
  routeOrder: [],
  routeSummary: "",
  routeReason: "",
  dailyTips: [],
  itemCount: 0,
  itinerary: {
    day: 1,
    theme: "空白计划",
    routeOrder: [],
    routeReason: "",
    morning: [],
    afternoon: [],
    evening: [],
    dailyTips: [],
  },
  slots: [
    {
      id: "morning",
      key: "morning",
      label: "上午",
      startTime: "06:00",
      endTime: "12:00",
      items: [],
      isEmpty: true,
    },
    {
      id: "afternoon",
      key: "afternoon",
      label: "下午",
      startTime: "12:00",
      endTime: "18:00",
      items: [],
      isEmpty: true,
    },
    {
      id: "evening",
      key: "evening",
      label: "晚上",
      startTime: "18:00",
      endTime: "24:00",
      items: [],
      isEmpty: true,
    },
  ],
};

const cabinetWithCreatedEvent: DayCabinetView = {
  ...emptyCabinet,
  routeOrder: ["摩天轮"],
  routeSummary: "摩天轮",
  itemCount: 1,
  itinerary: {
    ...emptyCabinet.itinerary,
    routeOrder: ["摩天轮"],
    morning: [
      {
        placeName: "摩天轮",
        type: "attraction",
        timeLabel: "10:00",
        reason: "想从高处看看这座城市。",
        guide: ["记得提前看开放时间。"],
        editorId: "item-ferris-wheel",
        editorSlotId: "morning",
      },
    ],
  },
  slots: [
    {
      id: "morning",
      key: "morning",
      label: "06:00-12:00",
      startTime: "06:00",
      endTime: "12:00",
      items: [
        {
          ref: {
            day: 1,
            slot: "morning",
            slotId: "morning",
            itemIndex: 0,
            placeName: "摩天轮",
            type: "attraction",
            editorId: "item-ferris-wheel",
          },
          item: {
            placeName: "摩天轮",
            type: "attraction",
            timeLabel: "10:00",
            reason: "想从高处看看这座城市。",
            guide: ["记得提前看开放时间。"],
            editorId: "item-ferris-wheel",
            editorSlotId: "morning",
          },
        },
      ],
      isEmpty: false,
    },
    emptyCabinet.slots[1]!,
    emptyCabinet.slots[2]!,
  ],
};

const blankPlan: TripPlan = {
  tripTitle: "空白旅行",
  summary: "先从第一站开始。",
  destination: "",
  days: 1,
  travelStyleSummary: "待补充",
  weatherSummary: {
    available: false,
    overview: "暂未获取天气。",
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
    options: [],
    suggestedPlatforms: [],
    note: "测试数据",
  },
  dailyItinerary: [],
  generalTips: [],
  warnings: [],
};

function renderToolbar() {
  return (
    <>
      <button type="button">待调整内容</button>
      <button type="button">AI 帮我补全</button>
    </>
  );
}

describe("Workspace empty edit cabinet", () => {
  it("derives default divider positions from existing DailyTimeSlot values", () => {
    const [firstDivider, secondDivider] = getCabinetDividerPercents(defaultTimeSlots);

    expect(firstDivider).toBeCloseTo(33.3333, 3);
    expect(secondDivider).toBeCloseTo(66.6666, 3);
  });

  it("updates only visual divider positions without mutating DailyTimeSlot data", () => {
    const originalSnapshot = JSON.parse(JSON.stringify(defaultTimeSlots));
    const nextDividerPercents = updateCabinetDividerPercentsAtIndex(
      getCabinetDividerPercents(defaultTimeSlots),
      0,
      (43 / 180) * 100,
    );

    expect(nextDividerPercents).toHaveLength(2);
    expect(nextDividerPercents[0]).not.toBe(getCabinetDividerPercents(defaultTimeSlots)[0]);
    expect(defaultTimeSlots).toEqual(originalSnapshot);
  });

  it("adds a visual divider without creating a new DailyTimeSlot", () => {
    const originalSnapshot = JSON.parse(JSON.stringify(defaultTimeSlots));
    const nextDividerPercents = insertCabinetDividerPercent(
      getCabinetDividerPercents(defaultTimeSlots),
    );

    expect(nextDividerPercents).toHaveLength(3);
    expect(defaultTimeSlots).toHaveLength(3);
    expect(defaultTimeSlots).toEqual(originalSnapshot);
  });

  it("removes only the selected visual divider", () => {
    const nextDividerPercents = removeCabinetDividerPercent([25, 50, 75], 1);

    expect(nextDividerPercents).toEqual([25, 75]);
  });

  it("keeps divider overrides isolated per day in the current session", () => {
    const initialDay1 = [20, 55];
    const initialDay2 = [30, 70];
    const overrides = updateDayDividerOverrides({
      dayNumber: 1,
      sourceSignature: "day-1-signature",
      positions: initialDay1,
      overrides: {},
    });
    const nextOverrides = updateDayDividerOverrides({
      dayNumber: 2,
      sourceSignature: "day-2-signature",
      positions: initialDay2,
      overrides,
    });

    expect(
      resolveDayDividerPositions({
        dayNumber: 1,
        sourceSignature: "day-1-signature",
        initialPositions: [33.33, 66.66],
        overrides: nextOverrides,
      }),
    ).toEqual(initialDay1);
    expect(
      resolveDayDividerPositions({
        dayNumber: 2,
        sourceSignature: "day-2-signature",
        initialPositions: [33.33, 66.66],
        overrides: nextOverrides,
      }),
    ).toEqual(initialDay2);
    expect(
      resolveDayDividerPositions({
        dayNumber: 1,
        sourceSignature: "changed-signature",
        initialPositions: [33.33, 66.66],
        overrides: nextOverrides,
      }),
    ).toEqual([33.33, 66.66]);
  });

  it("renders the empty edit mode as a cabinet with visual dividers and a divider tool", () => {
    const markup = renderToStaticMarkup(
      <DayCabinet
        cabinet={emptyCabinet}
        editEmptyToolbar={renderToolbar()}
        showActions
      />,
    );

    expect(markup).toContain("/images/workspace/edit-empty-cabinet-bg.png");
    expect(markup).toContain("增加隔板");
    expect(markup).toContain('role="separator"');
    expect(markup).toContain('data-testid="cabinet-divider-hit-area"');
    expect(markup).toContain("添加地点");
    expect(markup).toContain("写备注");
    expect(markup).toContain("待调整内容");
    expect(markup).toContain("AI 帮我补全");
  });

  it("keeps the read mode cover untouched", () => {
    const markup = renderToStaticMarkup(
      <DayCabinet cabinet={emptyCabinet} onRequestEdit={vi.fn()} />,
    );

    expect(markup).toContain("/images/workspace/empty-read-mode-cover.png");
    expect(markup).not.toContain("/images/workspace/edit-empty-cabinet-bg.png");
  });

  it("lets the cabinet remain the left editing surface instead of a nested card stack", () => {
    const markup = renderToStaticMarkup(
      <TripEditor
        activeCabinet={emptyCabinet}
        activeDayNumber={1}
        cabinets={[emptyCabinet]}
        compactEmptyEditMode
        editEmptyToolbar={renderToolbar()}
        showActions
        onAddDay={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(markup).toContain("/images/workspace/edit-empty-cabinet-bg.png");
    expect(markup).toContain("增加隔板");
    expect(markup).toContain('aria-label="添加一天"');
    expect(markup).not.toContain("journal-sheet");
  });

  it("keeps created events inside the cabinet workspace without changing event data", () => {
    const markup = renderToStaticMarkup(
      <TripEditor
        activeCabinet={cabinetWithCreatedEvent}
        activeDayNumber={1}
        cabinets={[cabinetWithCreatedEvent]}
        compactEmptyEditMode
        editEmptyToolbar={renderToolbar()}
        showActions
        onAddDay={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(markup).toContain("/images/workspace/edit-empty-cabinet-bg.png");
    expect(markup).toContain("摩天轮");
    expect(markup).toContain("cabinet-event-layer");
    expect(markup).toContain("cabinet-event-group");
    expect(markup).not.toContain("overflow-y-auto");
  });

  it("routes populated desktop edit mode through the cabinet workspace instead of legacy time slot sections", () => {
    const markup = renderToStaticMarkup(
      <TripEditor
        activeCabinet={cabinetWithCreatedEvent}
        activeDayNumber={1}
        cabinets={[cabinetWithCreatedEvent]}
        showActions
        onAddDay={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(markup).toContain("cabinet-event-layer");
    expect(markup).toContain("cabinet-event-group");
    expect(markup).not.toContain("journal-slot");
    expect(markup).not.toContain("cabinet-time-slot-shelf");
  });

  it("renders cabinet event blocks as compact blocks until expanded", () => {
    const block = cabinetWithCreatedEvent.slots[0]!.items[0]!;
    const collapsedMarkup = renderToStaticMarkup(
      <ItineraryBlock
        block={block}
        compactCabinetBlock
        isExpanded={false}
        showActions
        onDelete={vi.fn()}
        onToggleExpand={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    const expandedMarkup = renderToStaticMarkup(
      <ItineraryBlock
        block={block}
        compactCabinetBlock
        isExpanded
        showActions
        onDelete={vi.fn()}
        onToggleExpand={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(collapsedMarkup).toContain("摩天轮");
    expect(collapsedMarkup).not.toContain("10:00");
    expect(expandedMarkup).toContain("10:00");
  });

  it("renders selected event editing as a detail card above the cabinet", () => {
    const block = cabinetWithCreatedEvent.slots[0]!.items[0]!;
    const markup = renderToStaticMarkup(
      <EditEmptyCabinet
        dayNumber={1}
        selectedEventBlock={block}
        selectedEventId={block.item.editorId}
        slots={cabinetWithCreatedEvent.slots}
        onBlockDelete={vi.fn()}
        onBlockSelect={vi.fn()}
        onBlockUpdate={vi.fn()}
      />,
    );

    expect(markup).toContain("event-detail-editor-card");
    expect(markup).toContain('data-testid="workspace-event-editor"');
    expect(markup).toContain("cabinet-event-layer");
  });

  it("uses the shared active block id to highlight a cabinet block and open the detail card", () => {
    const block = cabinetWithCreatedEvent.slots[0]!.items[0]!;
    const activeBlockId = getItineraryBlockId(block);
    const markup = renderToStaticMarkup(
      <DayCabinet
        activeBlockId={activeBlockId}
        cabinet={cabinetWithCreatedEvent}
        compactEmptyEditMode
        showActions
        onBlockDelete={vi.fn()}
        onBlockSelectionClear={vi.fn()}
        onBlockSelect={vi.fn()}
        onBlockUpdate={vi.fn()}
      />,
    );

    expect(markup).toContain("event-detail-editor-card");
    expect(markup).toContain('data-selected="true"');
  });

  it("keeps the empty edit desktop shell in one-screen mode", () => {
    const markup = renderToStaticMarkup(
      <DesktopWorkspaceShell
        compactEmptyEditMode
        topBar={<div>顶部</div>}
        main={<div>空柜子</div>}
        inspector={<div>地图</div>}
      />,
    );

    expect(markup).toContain("空柜子");
    expect(markup).toContain("地图");
    expect(markup).toContain("overflow-hidden");
  });

  it("removes the duplicate blank guide but keeps pending changes and AI assist", () => {
    const markup = renderToStaticMarkup(
      <ModificationPanel
        externalDraftVersion={0}
        hasStops={false}
        isBlankWorkspace
        modificationDraft=""
        pendingChanges={[]}
        tripPlan={blankPlan}
        tripRequest={null}
        onClearPendingChanges={vi.fn()}
        onModificationRequestChange={vi.fn()}
        onQuickModification={vi.fn()}
        onRegenerated={vi.fn()}
        onRemovePendingChange={vi.fn()}
        onWritePendingChangesToDraft={vi.fn()}
      />,
    );

    expect(markup).toContain("待调整内容");
    expect(markup).toContain("AI 帮我补全");
  });

  it("keeps multi-day blank editing in compact excel-like tab mode", () => {
    expect(
      shouldUseCompactBlankEditMode({
        workspaceMode: "edit",
        workspaceSourceType: "blank_manual",
      }),
    ).toBe(true);

    const secondEmptyCabinet: DayCabinetView = {
      ...emptyCabinet,
      dayNumber: 2,
      itinerary: {
        ...emptyCabinet.itinerary,
        day: 2,
      },
    };

    const markup = renderToStaticMarkup(
      <TripEditor
        activeCabinet={secondEmptyCabinet}
        activeDayNumber={2}
        cabinets={[emptyCabinet, secondEmptyCabinet]}
        compactEmptyEditMode
        editEmptyToolbar={renderToolbar()}
        showActions
        onAddDay={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="添加一天"');
  });
});
