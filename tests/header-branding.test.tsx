import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Header } from "../components/layout/Header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/create",
}));

describe("Header branding", () => {
  it("uses Wanderly create-flow branding and removes legacy names", () => {
    const markup = renderToStaticMarkup(<Header />);
    const legacyDraftName = ["漫", "游草签"].join("");
    const legacyRouteName = ["自由行", "路线整理"].join("");

    expect(markup).toContain("Wanderly");
    expect(markup).toContain("旅行计划工作台");
    expect(markup).toContain("把旅行想法整理成可执行行程");
    expect(markup).not.toContain(legacyDraftName);
    expect(markup).not.toContain(legacyRouteName);
  });
});
