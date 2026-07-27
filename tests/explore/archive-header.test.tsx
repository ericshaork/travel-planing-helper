import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArchiveHeader } from "../../components/explore/archive/ArchiveHeader";

describe("ArchiveHeader SSR", () => {
  it("renders drawer mode with Chinese labels and close action", () => {
    const markup = renderToStaticMarkup(
      <ArchiveHeader
        mode="drawer"
        onClose={() => {}}
        item={{
          id: "archive-1",
          externalId: "cd_001",
          slug: "chengdu-food-3d",
          title: "成都 3 天烟火气路线",
          city: "成都",
          cityCode: "chengdu",
          summary: "summary",
          story: "story",
          tripType: "couple",
          days: 3,
          tags: ["美食"],
          recommendedFor: ["情侣"],
          coverImage: "/images/explore/fallback/explore-fallback-city.png",
          galleryImages: [],
          highlights: [],
          dailyItinerary: [],
          places: [],
          food: [],
          createDraftSeed: {
            tripTitle: "成都 3 天烟火气路线",
            sourceType: "explore_archive",
            tripRequestDraft: {
              destination: "成都",
              days: 3,
              interests: ["美食"],
            },
            tripPlanSeed: {
              tripTitle: "成都 3 天烟火气路线",
              summary: "summary",
              destination: "成都",
              days: 3,
              travelStyleSummary: "情侣",
              weatherSummary: "出发前再看天气。",
              budgetSummary: { totalEstimate: "待补充", breakdown: [] },
              hotelAreaAdvice: "待补充",
              transportAdvice: "待补充",
              dailyItinerary: [],
              generalTips: [],
              warnings: [],
            },
          },
          creatorType: "ai_generated",
        }}
      />,
    );

    expect(markup).toContain("阅读档案");
    expect(markup).toContain("关闭");
    expect(markup).toContain("成都 3 天烟火气路线");
    expect(markup).toContain("3 天");
    expect(markup).toContain("情侣");
  });
});
