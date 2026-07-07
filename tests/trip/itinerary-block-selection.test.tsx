import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ItineraryBlock,
  stopBlockSelectionPropagation,
} from "../../components/trip/ItineraryBlock";
import type { ItineraryBlockView } from "../../lib/trip/itinerary-view";

const block: ItineraryBlockView = {
  ref: {
    day: 2,
    slot: "afternoon",
    itemIndex: 1,
    placeName: "中山路步行街",
    type: "shopping",
  },
  item: {
    placeName: "中山路步行街",
    type: "shopping",
    reason: "逛吃逛吃",
    guide: [],
  },
};

describe("ItineraryBlock selection", () => {
  it("selected block 会输出选中态和地图状态", () => {
    const markup = renderToStaticMarkup(
      <ItineraryBlock
        block={block}
        isSelected
        mapStatus="confirmed"
        onSelect={() => {}}
      />,
    );

    expect(markup).toContain('data-selected="true"');
    expect(markup).toContain('role="button"');
    expect(markup).toContain("已定位");
  });

  it("BlockActions 按钮仍会渲染出来", () => {
    const markup = renderToStaticMarkup(
      <ItineraryBlock block={block} onAction={() => {}} />,
    );

    expect(markup).toContain("不要这个");
    expect(markup).toContain("换一个");
  });

  it("会阻断 block 选择冒泡", () => {
    const stopPropagation = vi.fn();

    stopBlockSelectionPropagation({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});
