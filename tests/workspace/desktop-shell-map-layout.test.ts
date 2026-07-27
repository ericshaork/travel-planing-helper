import { describe, expect, it } from "vitest";

import {
  getDefaultWorkspaceRatioForMapLayout,
  resolveInitialWorkspaceRatio,
} from "../../components/workspace/DesktopWorkspaceShell";

describe("DesktopWorkspaceShell mapLayout initialization", () => {
  it("maps Settings mapLayout to the expected default split ratio", () => {
    expect(getDefaultWorkspaceRatioForMapLayout("plan_focus")).toBe(60);
    expect(getDefaultWorkspaceRatioForMapLayout("balanced")).toBe(55);
    expect(getDefaultWorkspaceRatioForMapLayout("map_focus")).toBe(48);
  });

  it("uses Settings mapLayout when no localStorage ratio exists", () => {
    expect(
      resolveInitialWorkspaceRatio({
        savedRatio: null,
        mapLayout: "map_focus",
        containerWidth: 0,
      }),
    ).toBe(48);
  });

  it("keeps the saved localStorage ratio above Settings mapLayout", () => {
    expect(
      resolveInitialWorkspaceRatio({
        savedRatio: "62",
        mapLayout: "map_focus",
        containerWidth: 0,
      }),
    ).toBe(62);
  });
});
