import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "assets/**",
    "image-pipeline/**",
    "inventories/**",
    "output/**",
    "scripts/**",
    "temp/**",
    "templates/**",
    "travel-content-pipeline/**",
    "trip_packages/**",
  ]),
]);

export default eslintConfig;
