import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TripsEmptyState } from "../../components/trips/TripsEmptyState";

describe("TripsEmptyState SSR", () => {
  it("renders the empty-state copy and create link", () => {
    const markup = renderToStaticMarkup(<TripsEmptyState />);

    expect(markup).toContain("这里还没有你的旅行记录。");
    expect(markup).toContain("/create");
  });
});
