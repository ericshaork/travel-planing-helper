import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExploreCard } from "../../components/explore/ExploreCard";
import { getTripPackageExploreContents } from "../../lib/trip-packages/source";

describe("five-city Explore display", () => {
  it("renders five Trip Package cards with Chinese copy, days, cover and create CTA", async () => {
    const result = await getTripPackageExploreContents({ featured: true });

    expect(result.items).toHaveLength(5);

    const markup = result.items
      .map((item) =>
        renderToStaticMarkup(<ExploreCard item={item} onOpenArchive={() => {}} />),
      )
      .join("\n");

    for (const city of ["北京", "杭州", "成都", "上海", "西安"]) {
      expect(markup).toContain(city);
    }

    expect(markup).toContain("3 天");
    expect(markup).toContain("用此行程创建");
    expect(markup).toContain("阅读档案");
    expect(markup).toContain("%2Fimages%2Ftrip-packages%2F");
    expect(markup).not.toContain("Beijing");
    expect(markup).not.toContain("asset_instance_id");
    expect(markup).not.toContain("poi_refs");
    expect(markup).not.toContain("food_refs");
  });

  it("uses Chinese city overlay and image alt even when a fallback item has an English city", () => {
    const markup = renderToStaticMarkup(
      <ExploreCard
        item={{
          id: "old-beijing",
          slug: "old-beijing",
          title: "北京旧档案",
          summary: "旧数据也要用中文展示城市。",
          city: "Beijing",
          cityCode: "beijing",
          tripType: "citywalk",
          days: 3,
          tags: [],
          highlights: [],
        }}
      />,
    );

    expect(markup).toContain("北京");
    expect(markup).not.toContain(">Beijing<");
    expect(markup).not.toContain("Beijing 北京旧档案");
  });
});
