import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MapErrorState } from "../../components/map/MapErrorState";
import { MapFallback } from "../../components/map/MapFallback";
import { MapLoading } from "../../components/map/MapLoading";

describe("map state components", () => {
  it("MapLoading 会显示加载提示", () => {
    const markup = renderToStaticMarkup(<MapLoading />);

    expect(markup).toContain("地图加载中");
    expect(markup).toContain("先把地图底板接上");
  });

  it("MapFallback 会显示稳定占位文案", () => {
    const markup = renderToStaticMarkup(
      <MapFallback title="备用地图区" description="先放个稳定占位。" />,
    );

    expect(markup).toContain("备用地图区");
    expect(markup).toContain("先放个稳定占位");
  });

  it("MapErrorState 会根据错误码显示友好文案", () => {
    const missingKeyMarkup = renderToStaticMarkup(
      <MapErrorState code="missing_js_key" />,
    );
    const scriptErrorMarkup = renderToStaticMarkup(
      <MapErrorState code="script_load_failed" />,
    );

    expect(missingKeyMarkup).toContain("前端地图 Key 还没配好");
    expect(scriptErrorMarkup).toContain("地图脚本这次没接上");
    expect(scriptErrorMarkup).toContain("行程仍可正常查看");
  });
});
