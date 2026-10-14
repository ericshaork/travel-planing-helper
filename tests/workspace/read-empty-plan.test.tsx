import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmptyReadDayNotebook } from "../../components/trip/DayCabinet";
import { DesktopWorkspaceShell } from "../../components/workspace/DesktopWorkspaceShell";
import { MapPanel } from "../../components/workspace/MapPanel";
import { WorkspaceDayPanel } from "../../components/workspace/WorkspaceDayPanel";
import type { DayCabinetView } from "../../lib/trip/itinerary-view";

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
    { id: "morning", key: "morning", label: "上午", items: [], isEmpty: true },
    { id: "afternoon", key: "afternoon", label: "下午", items: [], isEmpty: true },
    { id: "evening", key: "evening", label: "晚上", items: [], isEmpty: true },
  ],
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

const noopProps = {
  searchKeyword: "",
  searchResults: [],
  searchWarnings: [],
  searchLoading: false,
  distanceTargetPointId: "",
  distanceLoading: false,
  resolvedPoints: [],
  onSearchKeywordChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onSearchResultSelect: vi.fn(),
  onSearchClear: vi.fn(),
  onTargetSlotChange: vi.fn(),
  onAddSelectedPlace: vi.fn(),
  onDistanceTargetChange: vi.fn(),
  onEstimateDistance: vi.fn(),
};

describe("Workspace empty read mode", () => {
  it("renders the empty plan as a light travel notebook page", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceDayPanel
        cabinet={emptyCabinet}
        allCabinets={[emptyCabinet]}
        compactBlankReadMode
        onRequestEdit={vi.fn()}
      />,
    );

    expect(markup).toContain("空白旅行手帐");
    expect(markup).toContain("这一页还在等待第一站");
    expect(markup).toContain("先放入一个想去的地方");
    expect(markup).toContain("未填写");
    expect(markup).toContain("开始填写");
    expect(markup).toContain("/images/workspace/empty-read-mode-cover.png");
    expect(markup).toContain("h-full");
    expect(markup).not.toContain("PAGE 01");
    expect(markup).not.toContain("第 01 页");
    expect(markup).not.toContain("60vh");
    expect(markup).not.toContain("100dvh");
    expect(markup).not.toContain("添加地点");
    expect(markup).not.toContain("编辑时间段");
  });

  it("uses the edit callback without saving or navigating", () => {
    const handleEdit = vi.fn();
    const element = EmptyReadDayNotebook({
      dayNumber: 1,
      onRequestEdit: handleEdit,
      compact: true,
    });
    const button = findButtonByText(element, "开始填写");

    expect(button).not.toBeNull();
    button?.props.onClick?.();

    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it("keeps the blank map state short and light in read mode", () => {
    const markup = renderToStaticMarkup(
      <MapPanel
        {...noopProps}
        workspaceSourceType="blank_manual"
        isBlankWorkspace
        hasStops={false}
        compactBlankReadMode
        workspaceMode="read"
      />,
    );

    expect(markup).toContain("桌面地图");
    expect(markup).toContain("还没有地点");
    expect(markup).toContain("地图加载中");
    expect(markup).toContain("先把地图底板接上");
    expect(markup).not.toContain("搜索地点");
    expect(markup).not.toContain("查询距离");
    expect(markup).not.toContain("路线详情");
  });

  it("keeps the compact desktop shell from adding a left pane scrollbar", () => {
    const markup = renderToStaticMarkup(
      <DesktopWorkspaceShell
        compactBlankReadMode
        topBar={<div>顶部工具栏</div>}
        main={<div>左侧封面</div>}
        inspector={<div>右侧地图</div>}
      />,
    );

    expect(markup).toContain("左侧封面");
    expect(markup).toContain("右侧地图");
    expect(markup).toContain("overflow-hidden");
    expect(markup).not.toContain("overflow-y-auto");
  });
});
