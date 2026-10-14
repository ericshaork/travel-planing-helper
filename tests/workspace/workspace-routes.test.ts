import { describe, expect, it } from "vitest";

import { buildWorkspaceRoute } from "../../lib/workspace/routes";

describe("workspace route helpers", () => {
  it("uses the original Workspace route by default", () => {
    expect(buildWorkspaceRoute()).toBe("/workspace");
  });

  it("preserves Map Studio trip and plan context when returning to Workspace", () => {
    expect(
      buildWorkspaceRoute({
        search:
          "?tripId=trip-1&planId=plan-2&draftId=draft-3&mode=map&layer=admin",
      }),
    ).toBe("/workspace?tripId=trip-1&planId=plan-2&draftId=draft-3&mode=map");
  });

  it("lets explicit context override URL context without copying unrelated params", () => {
    expect(
      buildWorkspaceRoute({
        search: "?tripId=old-trip&planId=plan-2&source=map-studio",
        context: {
          tripId: "trip-1",
        },
      }),
    ).toBe("/workspace?tripId=trip-1&planId=plan-2");
  });
});
