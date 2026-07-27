import { describe, expect, it } from "vitest";

import { resolveInitialWorkspaceModeDefault } from "../../hooks/useTripWorkspaceState";

describe("Workspace defaultMode initialization", () => {
  it("uses Settings defaultMode=edit for normal Workspace initialization", () => {
    expect(
      resolveInitialWorkspaceModeDefault({
        settingsDefaultMode: "edit",
      }),
    ).toBe("edit");
  });

  it("uses Settings defaultMode=read for normal Workspace initialization", () => {
    expect(
      resolveInitialWorkspaceModeDefault({
        settingsDefaultMode: "read",
      }),
    ).toBe("read");
  });

  it("keeps explicit blank_manual session mode above Settings fallback", () => {
    expect(
      resolveInitialWorkspaceModeDefault({
        sessionModeDefault: "edit",
        settingsDefaultMode: "read",
      }),
    ).toBe("edit");
  });
});
