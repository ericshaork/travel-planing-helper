import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CreateEntryHub } from "../components/create/CreateEntryHub";

describe("Create entry hub", () => {
  it("shows import, AI creation, and blank plan entry choices", () => {
    const markup = renderToStaticMarkup(<CreateEntryHub />);
    const legacyDraftName = ["漫", "游草签"].join("");
    const legacyRouteName = ["自由行", "路线整理"].join("");

    expect(markup).toContain("开始一次旅行");
    expect(markup).toContain("选择一种方式，把旅行想法整理成可执行行程。");
    expect(markup).toContain("导入已有计划");
    expect(markup).toContain("AI 创建");
    expect(markup).toContain("推荐");
    expect(markup).toContain("直接新建计划");
    expect(markup).toContain('href="/create?source=file"');
    expect(markup).toContain('href="/create?source=ai"');
    expect(markup).toContain("进入导入流程");
    expect(markup).toContain("进入五问流程");
    expect(markup).toContain("直接进入工作台");
    expect(markup).toContain("IMPORT");
    expect(markup).toContain("AI GUIDE");
    expect(markup).toContain("BLANK");
    expect(markup).toContain("路线只是参考，出发前请确认实时天气、票价和开放状态。");
    expect(markup).toContain("慢一点，通常比多塞两个景点更好玩。");
    expect(markup).not.toContain(legacyDraftName);
    expect(markup).not.toContain(legacyRouteName);
  });
});
