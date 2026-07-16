import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: {} }),
}));

vi.mock("../../lib/supabase/auth-client", () => ({
  getBrowserAccessToken: vi.fn().mockResolvedValue("token-123"),
}));

import { cloneDefaultUserSettings } from "../../lib/settings/defaults";
import { getUserSettings, updateUserSettings } from "../../lib/settings/client";

describe("settings client helpers", () => {
  it("getUserSettings 读取成功时返回 settings", async () => {
    const settings = cloneDefaultUserSettings();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        settings,
      }),
    });

    const result = await getUserSettings({ fetchImpl: fetchImpl as never });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/user-settings",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    );
    expect(result).toEqual(settings);
  });

  it("updateUserSettings 保存时发送 PATCH 并返回最新 settings", async () => {
    const settings = cloneDefaultUserSettings();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        settings,
      }),
    });

    const result = await updateUserSettings(settings, {
      fetchImpl: fetchImpl as never,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/user-settings",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
        body: JSON.stringify(settings),
      }),
    );
    expect(result).toEqual(settings);
  });

  it("读取失败时抛出中文错误", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: {
          message: "暂时没拉到你的默认设置。",
        },
      }),
    });

    await expect(
      getUserSettings({ fetchImpl: fetchImpl as never }),
    ).rejects.toThrow("暂时没拉到你的默认设置。");
  });

  it("保存失败时抛出中文错误", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: {
          message: "暂时还没更新成功。",
        },
      }),
    });

    await expect(
      updateUserSettings(cloneDefaultUserSettings(), {
        fetchImpl: fetchImpl as never,
      }),
    ).rejects.toThrow("暂时还没更新成功。");
  });
});
