import { describe, expect, it } from "vitest";

import { getSaveButtonCopy } from "../../lib/trips/save-status";

describe("getSaveButtonCopy", () => {
  it("shows create copy for an unsaved plan", () => {
    expect(getSaveButtonCopy("authenticated", "idle", null)).toEqual({
      label: "保存计划",
      message: "当前这版还没保存到我的行程。",
    });
  });

  it("shows update copy when savedTripId exists", () => {
    expect(
      getSaveButtonCopy("authenticated", "idle", {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
      }),
    ).toEqual({
      label: "更新已保存计划",
      message: "当前这版已经绑定到一条云端记录。",
    });
  });

  it("shows restored copy when opened from /trips", () => {
    expect(
      getSaveButtonCopy("authenticated", "idle", {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
        restoredAt: "2026-07-07T08:00:00.000Z",
      }),
    ).toEqual({
      label: "更新已保存计划",
      message: "当前这版是从我的行程打开的，可以继续更新这一条。",
    });
  });

  it("shows in-progress copy while updating", () => {
    expect(
      getSaveButtonCopy("authenticated", "updating", {
        savedTripId: "trip-1",
        savedTripTitle: "厦门 3 天慢慢玩",
      }),
    ).toEqual({
      label: "更新中...",
      message: "正在更新这条已保存计划。",
    });
  });
});
