import { describe, expect, it } from "vitest";

import {
  CREATE_MODE_OPTIONS,
  getCreateModeOption,
} from "../../lib/trip/create-modes";

describe("create modes", () => {
  it("defines both AI and self-directed entry modes", () => {
    expect(CREATE_MODE_OPTIONS.map((item) => item.id)).toEqual([
      "ai-assisted",
      "self-directed",
    ]);
  });

  it("marks AI mode as available and self-directed mode as v1.5 placeholder", () => {
    expect(getCreateModeOption("ai-assisted")).toMatchObject({
      available: true,
      statusLabel: "可用",
    });

    expect(getCreateModeOption("self-directed")).toMatchObject({
      available: false,
      statusLabel: "v1.5",
    });
  });
});
