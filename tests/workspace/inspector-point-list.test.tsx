import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { InspectorPointList } from "../../components/workspace/InspectorPointList";
import type { DayRouteInsight } from "../../lib/trip/route-insight";

const insight: DayRouteInsight = {
  dayNumber: 1,
  dayTitle: "City Day",
  date: "2026-07-08",
  routeSummary: undefined,
  weatherImpacts: [],
  mapPoints: [
    {
      id: "resolved-1",
      name: "中山路",
      dayIndex: 1,
      slot: "morning",
      itemIndex: 0,
      itemType: "attraction",
      coordinates: { lat: 24.4555, lng: 118.0782 },
      resolved: true,
      provider: "amap",
      address: "思明区中山路",
    },
    {
      id: "pending-1",
      name: "老城区散步",
      dayIndex: 1,
      slot: "afternoon",
      itemIndex: 1,
      itemType: "free_time",
      resolved: false,
      warning: "名称还比较泛，建议出发前再确认。",
    },
  ],
};

function collectClickHandlers(node: unknown, handlers: Array<() => void> = []) {
  if (!node || typeof node !== "object") {
    return handlers;
  }

  const typedNode = node as {
    props?: {
      onClick?: () => void;
      children?: unknown;
    };
  };

  if (typedNode.props?.onClick) {
    handlers.push(typedNode.props.onClick);
  }

  const children = typedNode.props?.children;
  if (Array.isArray(children)) {
    children.forEach((child) => collectClickHandlers(child, handlers));
  } else if (children) {
    collectClickHandlers(children, handlers);
  }

  return handlers;
}

describe("InspectorPointList", () => {
  it("会渲染 active 状态和未确认提示", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointList insight={insight} activePointId="pending-1" />,
    );

    expect(markup).toContain("当前查看");
    expect(markup).toContain("这个地点还没确认");
    expect(markup).toContain('aria-pressed="true"');
  });

  it("点击已确认和未确认点位都会触发选择回调", () => {
    const onPointSelect = vi.fn();
    const element = InspectorPointList({
      insight,
      activePointId: null,
      onPointSelect,
    });
    const handlers = collectClickHandlers(element);

    handlers[0]?.();
    handlers[1]?.();

    expect(onPointSelect).toHaveBeenNthCalledWith(1, "resolved-1");
    expect(onPointSelect).toHaveBeenNthCalledWith(2, "pending-1");
  });
});
