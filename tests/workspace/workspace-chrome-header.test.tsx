import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorkspaceChromeHeader } from "../../components/workspace/WorkspaceRoutePage";

describe("WorkspaceChromeHeader", () => {
  it("renders the return to Explore link beside the workspace navigation", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceChromeHeader />,
    );

    expect(markup).toContain("返回探索");
    expect(markup).toContain('href="/explore"');
    expect(markup).toContain("工作台");
    expect(markup).toContain("我的行程");
    expect(markup).toContain("设置");
  });
});
