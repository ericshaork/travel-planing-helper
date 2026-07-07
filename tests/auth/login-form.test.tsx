import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import { LoginForm } from "../../components/auth/LoginForm";

describe("LoginForm SSR", () => {
  it("未登录时会渲染邮箱输入和发送按钮", () => {
    const markup = renderToStaticMarkup(
      <LoginForm
        returnTo="/result"
        initialState={{ status: "anonymous", user: null, error: null }}
      />,
    );

    expect(markup).toContain("发送登录链接");
    expect(markup).toContain("type=\"email\"");
    expect(markup).toContain("登录后会回到 /result");
  });

  it("已登录时会显示回到工作台和退出", () => {
    const markup = renderToStaticMarkup(
      <LoginForm
        returnTo="/"
        initialState={{
          status: "authenticated",
          user: { id: "user-1", email: "user@example.com" },
          error: null,
        }}
      />,
    );

    expect(markup).toContain("你已经登录了");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("回到工作台");
    expect(markup).toContain("退出");
  });
});
