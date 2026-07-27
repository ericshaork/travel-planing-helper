import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "image-pipeline/**",
      "travel-content-pipeline/**",
      "scripts/**",
      "temp/**",
      "output/**",
    ],
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
