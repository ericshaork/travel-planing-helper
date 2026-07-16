import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/result",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import { UserMenu } from "../../components/auth/UserMenu";

describe("UserMenu SSR", () => {
  it("未登录时显示我的行程、设置和登录入口", () => {
    const markup = renderToStaticMarkup(
      <UserMenu initialState={{ status: "anonymous", user: null, error: null }} />,
    );

    expect(markup).toContain("我的行程");
    expect(markup).toContain("设置");
    expect(markup).toContain("注册 / 登录");
    expect(markup).toContain("/login?returnTo=%2Ftrips");
    expect(markup).toContain("/login?returnTo=%2Fsettings");
  });

  it("已登录时显示邮箱、我的行程、设置和退出按钮", () => {
    const markup = renderToStaticMarkup(
      <UserMenu
        initialState={{
          status: "authenticated",
          user: { id: "user-1", email: "user@example.com" },
          error: null,
        }}
      />,
    );

    expect(markup).toContain("当前账号");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("我的行程");
    expect(markup).toContain("设置");
    expect(markup).toContain("退出登录");
  });
});
