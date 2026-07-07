import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/create",
}));

import { AuthStatus } from "../../components/auth/AuthStatus";

describe("AuthStatus SSR", () => {
  it("未登录时显示登录", () => {
    const markup = renderToStaticMarkup(
      <AuthStatus initialState={{ status: "anonymous", user: null, error: null }} />,
    );

    expect(markup).toContain("登录");
  });

  it("已登录时显示邮箱", () => {
    const markup = renderToStaticMarkup(
      <AuthStatus
        initialState={{
          status: "authenticated",
          user: { id: "user-1", email: "user@example.com" },
          error: null,
        }}
      />,
    );

    expect(markup).toContain("user@example.com");
  });
});
