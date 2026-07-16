import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SavedTripCard } from "../../components/trips/SavedTripCard";

describe("SavedTripCard SSR", () => {
  it("renders trip facts, chinese metadata tags, and rename/delete actions", () => {
    const markup = renderToStaticMarkup(
      <SavedTripCard
        trip={{
          id: "trip-1",
          title: "厦门 3 天慢慢玩",
          destination_city: "厦门",
          start_date: "2026-07-10",
          end_date: "2026-07-12",
          days: 3,
          budget: 2500,
          cover_image_url: null,
          source_type: "explore_import",
          status: "archived",
          trip_preferences_json: {},
          local_draft_id: null,
          last_opened_at: "2026-07-15T09:30:00.000Z",
          created_at: "2026-07-01T08:00:00.000Z",
          updated_at: "2026-07-02T08:00:00.000Z",
        }}
      />,
    );

    expect(markup).toContain("厦门 3 天慢慢玩");
    expect(markup).toContain("厦门");
    expect(markup).toContain("2026-07-10 - 2026-07-12");
    expect(markup).toContain("3 天");
    expect(markup).toContain("预算 ¥2500");
    expect(markup).toContain("2026-07-02 08:00");
    expect(markup).toContain("2026-07-15 09:30");
    expect(markup).toContain("已归档");
    expect(markup).toContain("Explore 导入");
    expect(markup).toContain("打开到 Workspace");
    expect(markup).toContain("重命名");
    expect(markup).toContain("删除");
  });

  it("falls back to chinese text when last_opened_at is empty", () => {
    const markup = renderToStaticMarkup(
      <SavedTripCard
        trip={{
          id: "trip-2",
          title: "杭州两天放松版",
          destination_city: "杭州",
          start_date: null,
          end_date: null,
          days: null,
          budget: null,
          cover_image_url: null,
          source_type: "ai_generated",
          status: "saved",
          trip_preferences_json: {},
          local_draft_id: null,
          last_opened_at: null,
          created_at: "2026-07-01T08:00:00.000Z",
          updated_at: "2026-07-02T08:00:00.000Z",
        }}
      />,
    );

    expect(markup).toContain("尚未打开");
    expect(markup).toContain("已保存");
    expect(markup).toContain("AI 生成");
  });
});
