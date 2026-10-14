import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  TripWorkspace,
  shouldUseWorkspaceReadView,
} from "../../components/workspace/TripWorkspace";
import { WorkspaceReadDay } from "../../components/workspace/read/WorkspaceReadDay";
import { WorkspaceReadView } from "../../components/workspace/read/WorkspaceReadView";
import type { TripPlan } from "../../lib/trip/types";
import { buildWorkspaceReadViewModel } from "../../lib/workspace/read-model";

const readTripPlan: TripPlan = {
  tripTitle: "北京 2 天慢慢逛",
  summary: "先把胡同和公园排顺，再留一点慢下来的时间。",
  destination: "北京",
  days: 2,
  travelStyleSummary: "城市散步、轻松一点。",
  weatherSummary: {
    available: false,
    overview: "先按通用天气准备。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "测试数据",
  },
  budgetSummary: {
    totalEstimate: "约 2200 元",
    transport: "约 600 元",
    hotel: "约 900 元",
    food: "约 350 元",
    tickets: "约 200 元",
    localTransport: "约 100 元",
    flexibleSpending: "约 50 元",
    note: "测试数据",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "优先地铁，远一点再打车。",
    options: [],
    suggestedPlatforms: [],
    note: "测试数据",
  },
  dailyItinerary: [
    {
      day: 1,
      date: "2026-07-10",
      theme: "城墙边慢慢走",
      routeOrder: ["角楼", "胡同咖啡", "晚餐"],
      routeReason: "把步行路线放在一起，别来回折返。",
      morning: [
        {
          placeName: "角楼",
          type: "attraction",
          timeLabel: "09:30",
          reason: "早一点到，人会松一些。",
          guide: [],
          editorId: "read-day-1-morning",
          editorSlotId: "morning",
        },
      ],
      afternoon: [
        {
          placeName: "胡同咖啡",
          type: "food",
          timeLabel: "14:00",
          reason: "中间坐一下，慢慢看街景。",
          guide: [],
          editorId: "read-day-1-afternoon",
          editorSlotId: "afternoon",
        },
      ],
      evening: [
        {
          placeName: "晚餐",
          type: "food",
          timeLabel: "18:30",
          reason: "晚上收在同一片区，省一点折腾。",
          guide: [],
          editorId: "read-day-1-evening",
          editorSlotId: "evening",
        },
      ],
      dailyTips: ["这天别排太满。"],
    },
    {
      day: 2,
      date: "2026-07-11",
      theme: "公园和小馆子",
      routeOrder: ["公园散步", "午饭"],
      routeReason: "第二天节奏再放缓一点。",
      morning: [
        {
          placeName: "公园散步",
          type: "attraction",
          timeLabel: "10:00",
          reason: "留给慢一点的开场。",
          guide: [],
          editorId: "read-day-2-morning",
          editorSlotId: "morning",
        },
      ],
      afternoon: [
        {
          placeName: "午饭",
          type: "food",
          timeLabel: "13:00",
          reason: "找一家顺路的小馆子。",
          guide: [],
          editorId: "read-day-2-afternoon",
          editorSlotId: "afternoon",
        },
      ],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
};

function getText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getText).join("");
  }

  if (!isValidElement(node)) {
    return "";
  }

  return getText((node.props as { children?: ReactNode }).children);
}

function findButtonByText(
  node: ReactNode,
  text: string,
): ReactElement<{ onClick?: () => void }> | null {
  if (!isValidElement(node)) {
    return null;
  }

  if (node.type === "button" && getText(node).includes(text)) {
    return node as ReactElement<{ onClick?: () => void }>;
  }

  const children = Children.toArray(
    (node.props as { children?: ReactNode }).children,
  );

  for (const child of children) {
    const match = findButtonByText(child, text);

    if (match) {
      return match;
    }
  }

  return null;
}

describe("Workspace read display adapter", () => {
  it("uses the dedicated read view only for non-blank read mode", () => {
    expect(
      shouldUseWorkspaceReadView({
        workspaceMode: "read",
        compactBlankReadMode: false,
      }),
    ).toBe(true);
    expect(
      shouldUseWorkspaceReadView({
        workspaceMode: "read",
        compactBlankReadMode: true,
      }),
    ).toBe(false);
    expect(
      shouldUseWorkspaceReadView({
        workspaceMode: "edit",
        compactBlankReadMode: false,
      }),
    ).toBe(false);
    expect(
      shouldUseWorkspaceReadView({
        workspaceMode: "map",
        compactBlankReadMode: false,
      }),
    ).toBe(false);
  });

  it("builds a read view model from TripPlan", () => {
    const viewModel = buildWorkspaceReadViewModel(readTripPlan);

    expect(viewModel.title).toBe("北京 2 天慢慢逛");
    expect(viewModel.destination).toBe("北京");
    expect(viewModel.days).toBe(2);
    expect(viewModel.highlights).toContain("角楼");
    expect(viewModel.visuals).toEqual({});
    expect(viewModel.daysList).toHaveLength(2);
    expect(viewModel.daysList[0]?.title).toBe("城墙边慢慢走");
    expect(viewModel.daysList[0]?.places[0]?.title).toBe("角楼");
    expect(viewModel.daysList[0]?.places[0]?.typeLabel).toBe("景点");
    expect(viewModel.daysList[0]?.places[0]?.visuals).toEqual({});
  });

  it("renders trip summary and day tabs in WorkspaceReadView", () => {
    const viewModel = buildWorkspaceReadViewModel(readTripPlan);
    const markup = renderToStaticMarkup(
      <WorkspaceReadView
        viewModel={viewModel}
        activeDayNumber={1}
        activeBlockId={null}
        onSelectDay={vi.fn()}
        onBlockSelect={vi.fn()}
      />,
    );

    expect(markup).toContain("workspace-read-view");
    expect(markup).toContain("北京 2 天慢慢逛");
    expect(markup).toContain("北京");
    expect(markup).toContain("2 天");
    expect(markup).toContain("第 1 天");
    expect(markup).toContain("第 2 天");
    expect(markup).toContain("角楼");
  });

  it("renders day content through WorkspaceReadDay and keeps place selection clickable", () => {
    const viewModel = buildWorkspaceReadViewModel(readTripPlan);
    const handleSelect = vi.fn();
    const element = WorkspaceReadDay({
      day: viewModel.daysList[0]!,
      activePlaceId: null,
      onPlaceSelect: handleSelect,
    });
    const button = findButtonByText(element, "角楼");
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("城墙边慢慢走");
    expect(markup).toContain("角楼");
    expect(markup).toContain("胡同咖啡");
    expect(markup).toContain("路线摘要");
    expect(markup).toContain("当天亮点");
    expect(markup).toContain("当天备注");

    expect(button).not.toBeNull();
    button?.props.onClick?.();
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it("keeps TripWorkspace export surface available for the read split", () => {
    expect(TripWorkspace).toBeTypeOf("function");
  });
});
