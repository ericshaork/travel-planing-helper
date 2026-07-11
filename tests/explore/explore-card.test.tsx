import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExploreCard } from "../../components/explore/ExploreCard";

describe("ExploreCard SSR", () => {
  it("renders a single archive reading entry point", () => {
    const markup = renderToStaticMarkup(
      <ExploreCard
        item={{
          id: "row-1",
          slug: "chengdu-food-3d",
          title: "Chengdu archive",
          summary: "summary",
          city: "Chengdu",
          cityCode: "chengdu",
          tripType: "food",
          days: 3,
          tags: ["spicy"],
          highlights: ["hotpot"],
        }}
      />,
    );

    expect(markup).toContain("Open archive");
    expect(markup).toContain("/explore/chengdu-food-3d");
    expect(markup).toContain("阅读档案");
  });
});
