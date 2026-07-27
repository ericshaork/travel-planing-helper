import { describe, expect, it } from "vitest";

import { shouldDefaultMapInspectorOpen } from "../../components/workspace/MapPanel";

describe("MapPanel mapOverlay initialization", () => {
  it("opens the main map inspector by default when Settings uses expanded", () => {
    expect(shouldDefaultMapInspectorOpen("expanded")).toBe(true);
  });

  it("keeps the main map inspector collapsed by default when Settings uses collapsed", () => {
    expect(shouldDefaultMapInspectorOpen("collapsed")).toBe(false);
  });
});
