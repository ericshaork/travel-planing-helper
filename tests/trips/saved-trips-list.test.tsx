import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SavedTripsList } from "../../components/trips/SavedTripsList";

describe("SavedTripsList SSR", () => {
  it("renders multiple saved trip cards with open and delete actions", () => {
    const markup = renderToStaticMarkup(
      <SavedTripsList
        trips={[
          {
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
            created_at: "2026-08-01T08:00:00.000Z",
            updated_at: "2026-08-02T08:00:00.000Z",
          },
        ]}
      />,
    );

    expect(markup).toContain("厦门 3 天慢慢玩");
    expect(markup).toContain("成都 4 天慢慢吃");
    expect(markup).toContain("打开到工作台");
    expect(markup).toContain("删除");
  });

  it("renders the empty state when the list is empty", () => {
    const markup = renderToStaticMarkup(<SavedTripsList trips={[]} />);

    expect(markup).toContain("你还没有存下来的行程");
  });
});
