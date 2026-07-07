import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SavedTripCard } from "../../components/trips/SavedTripCard";

describe("SavedTripCard SSR", () => {
  it("renders trip facts plus open and delete actions", () => {
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
    expect(markup).toContain("打开到工作台");
    expect(markup).toContain("删除");
  });
});
