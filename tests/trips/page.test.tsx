import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../../components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("../../components/layout/Footer", () => ({
  Footer: () => <div>Footer</div>,
}));

vi.mock("../../components/auth/useAuthStatus", () => ({
  useAuthStatus: () => ({
    status: "anonymous",
    user: null,
    error: null,
  }),
}));

import TripsPage from "../../app/trips/page";

describe("TripsPage SSR", () => {
  it("keeps the login protection copy for anonymous users", () => {
    const markup = renderToStaticMarkup(<TripsPage />);

    expect(markup).toContain("登录后查看“我的行程”");
    expect(markup).toContain("去登录");
  });
});
