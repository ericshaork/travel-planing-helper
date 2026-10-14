import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs/config", () => ({
  withSentryConfig: (config: unknown) => config,
}));

import nextConfig from "../next.config";

describe("Netlify function tracing exclusions", () => {
  it("excludes large static assets across every route", () => {
    const exclusions = nextConfig.outputFileTracingExcludes?.["*"];
    expect(exclusions).toEqual([
      "./public/**/*",
      "./.next/cache/**/*",
      "./image-pipeline/image-pipeline/assets/**/*",
      "./trip_packages/**/images/**/*.{png,jpg,jpeg,webp,gif,avif,svg}",
    ]);
  });

  it("retains admin-specific exclusions without globally excluding runtime JSON data", () => {
    expect(nextConfig.outputFileTracingExcludes?.["/admin/explore-production"]).toContain("./trip_packages/**/*");
    expect(nextConfig.outputFileTracingExcludes?.["/api/admin/explore-production/**"]).toContain("./public/**/*");
    expect(nextConfig.outputFileTracingExcludes?.["*"]).not.toContain("./trip_packages/**/*");
    expect(nextConfig.outputFileTracingExcludes?.["*"]).not.toContain("./data/**/*");
  });
});
