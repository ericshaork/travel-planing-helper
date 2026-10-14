import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MapStudioRightDrawer } from "../../components/map-studio/MapStudioRightDrawer";
import {
  createDefaultMapLayerAvailability,
  createDefaultMapLayerState,
} from "../../lib/map-studio/layer-state";

const layerState = createDefaultMapLayerState();
const layerAvailability = {
  ...createDefaultMapLayerAvailability(),
  explore: {
    ...createDefaultMapLayerAvailability().explore,
    food: true,
  },
};

const drawerHandlers = {
  onPrimaryViewChange: vi.fn(),
  onAdminPrecisionChange: vi.fn(),
  onToggleExploreLayer: vi.fn(),
  onToggleEnvironmentLayer: vi.fn(),
  onToggleCategory: vi.fn(),
  onClose: vi.fn(),
};

describe("MapStudioRightDrawer", () => {
  it("renders the core map layer controls in the right drawer", () => {
    const markup = renderToStaticMarkup(
      <MapStudioRightDrawer
        mode="layers"
        layerState={layerState}
        layerAvailability={layerAvailability}
        activeCategoryIds={["attraction", "food"]}
        {...drawerHandlers}
      />,
    );

    expect(markup).toContain('aria-label="图层抽屉"');
    expect(markup).toContain("主视图");
    expect(markup).toContain("行政区划");
    expect(markup).toContain("旅行区域");
    expect(markup).toContain("纯地图");
    expect(markup).toContain("行政精度");
    expect(markup).toContain("探索内容");
    expect(markup).toContain("推荐地点");
    expect(markup).toContain("候选地点");
    expect(markup).toContain("行程地点");
    expect(markup).toContain("环境叠加");
    expect(markup).toContain("待接入");
    expect(markup).not.toContain("路线");
    expect(markup).not.toContain("动线");
    expect(markup).not.toContain("target_full_ui_mockup.png");
    expect(markup).not.toContain("top_full_hud.png");
    expect(markup).not.toContain("bottom_command_bar_full.png");
  });

  it("renders category filters through the same drawer shell", () => {
    const markup = renderToStaticMarkup(
      <MapStudioRightDrawer
        mode="filters"
        layerState={layerState}
        layerAvailability={layerAvailability}
        activeCategoryIds={["attraction", "food"]}
        {...drawerHandlers}
      />,
    );

    expect(markup).toContain('aria-label="筛选抽屉"');
    expect(markup).toContain("景点");
    expect(markup).toContain("街区");
    expect(markup).toContain("文化");
    expect(markup).toContain("自然");
    expect(markup).toContain("餐饮");
    expect(markup).toContain("购物");
    expect(markup).toContain("小众");
    expect(markup).not.toContain('aria-label="图层抽屉"');
  });

  it("disables admin precision controls outside the admin primary view", () => {
    const markup = renderToStaticMarkup(
      <MapStudioRightDrawer
        mode="layers"
        layerState={{
          ...layerState,
          primaryView: "clean",
        }}
        layerAvailability={layerAvailability}
        activeCategoryIds={["attraction", "food"]}
        {...drawerHandlers}
      />,
    );

    expect(markup).toContain("仅行政区划主视图可用");
    expect(markup).toContain("disabled");
  });
});
