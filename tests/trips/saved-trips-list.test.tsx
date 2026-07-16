import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SavedTripsList } from "../../components/trips/SavedTripsList";

const trips = [
  {
    id: "trip-1",
    title: "厦门 3 天慢慢玩",
    destination_city: "厦门",
    start_date: "2026-07-10",
    end_date: "2026-07-12",
    days: 3,
    budget: 2500,
    cover_image_url: null,
    source_type: "ai_generated" as const,
    status: "saved" as const,
    trip_preferences_json: {},
    local_draft_id: null,
    last_opened_at: null,
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-02T08:00:00.000Z",
  },
  {
    id: "trip-2",
    title: "成都 4 天慢慢吃",
    destination_city: "成都",
    start_date: "2026-08-10",
    end_date: "2026-08-13",
    days: 4,
    budget: 3200,
    cover_image_url: null,
    source_type: "blank_manual" as const,
    status: "draft" as const,
    trip_preferences_json: {},
    local_draft_id: "draft-2",
    last_opened_at: "2026-07-15T08:00:00.000Z",
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-02T08:00:00.000Z",
  },
];

describe("SavedTripsList SSR", () => {
  it("renders search box, filter controls, and trip cards", () => {
    const markup = renderToStaticMarkup(
      <SavedTripsList trips={trips} searchValue="厦门" statusFilter="saved" sourceTypeFilter="ai_generated" />,
    );

    expect(markup).toContain("搜索行程标题");
    expect(markup).toContain("状态筛选");
    expect(markup).toContain("来源筛选");
    expect(markup).toContain("厦门 3 天慢慢玩");
    expect(markup).toContain("成都 4 天慢慢吃");
    expect(markup).toContain("AI 生成");
    expect(markup).toContain("空白手搓");
    expect(markup).toContain("清空筛选");
  });

  it("renders filtered empty state when no trips match", () => {
    const markup = renderToStaticMarkup(
      <SavedTripsList trips={[]} searchValue="苏州" statusFilter="archived" />,
    );

    expect(markup).toContain("这组搜索和筛选下还没有结果");
    expect(markup).toContain("回到全部列表");
  });

  it("renders the default empty state when the list is empty without filters", () => {
    const markup = renderToStaticMarkup(<SavedTripsList trips={[]} />);

    expect(markup).toContain("这里还没有存下来的行程");
  });
});
