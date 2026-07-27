import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExploreCard } from "../../components/explore/ExploreCard";

describe("ExploreCard SSR", () => {
  it("renders a readable archive entry and create call-to-action", () => {
    const markup = renderToStaticMarkup(
      <ExploreCard
        item={{
          id: "row-1",
          slug: "chengdu-food-3d",
          title: "成都 3 天烟火气路线",
          summary: "茶馆、街巷和火锅串成一版不赶路的行程。",
          city: "成都",
          cityCode: "chengdu",
          tripType: "couple",
          days: 3,
          tags: ["美食"],
          highlights: ["火锅"],
        }}
      />,
    );

    expect(markup).toContain("/explore/chengdu-food-3d");
    expect(markup).toContain("成都");
    expect(markup).toContain("成都 3 天烟火气路线");
    expect(markup).toContain("3 天");
    expect(markup).toContain("情侣");
    expect(markup).toContain("阅读档案");
    expect(markup).toContain("用此行程创建");
  });
});
