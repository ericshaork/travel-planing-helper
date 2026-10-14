import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const exploreProductionTraceExcludes = [
  "./.claude/**/*",
  "./.qwen/**/*",
  "./docs/**/*",
  "./tests/**/*",
  "./temp/**/*",
  "./tmp/**/*",
  "./*.md",
  "./WANDERLY_V2_FULL_ENV_TEMPLATE.env.local*",
  "./public/**/*",
  "./【001】2025年带审图号全国行政区划shp（省、市、县）/**/*",
  "./【144】全国旅游景点POI数据（2025年）/**/*",
  "./data/admin/**/*",
  "./data/source-manifests/**/*",
  "./trip_packages/**/*",
  "./travel-content-pipeline/docs/**/*",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "/admin/explore-production": exploreProductionTraceExcludes,
    "/api/admin/explore-production/**": exploreProductionTraceExcludes,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "wanderly-e0",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
