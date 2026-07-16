import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TripsEmptyState } from "../../components/trips/TripsEmptyState";

describe("TripsEmptyState SSR", () => {
  it("renders the empty-state copy and create link", () => {
    const markup = renderToStaticMarkup(<TripsEmptyState />);

    expect(markup).toContain("这里还没有存下来的行程");
    expect(markup).toContain("/create");
  });
});
