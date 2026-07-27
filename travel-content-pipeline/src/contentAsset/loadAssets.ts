import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeAsset, validateAsset } from "./validateAsset.js";
import type { AssetLoadResult, ContentAsset } from "./types.js";

const CONTENT_ASSET_ROOT = path.resolve(process.cwd(), "input", "content_assets_v1");

export async function loadAssets(city: string): Promise<ContentAsset[]> {
  const result = await loadAssetsWithDiagnostics(city);

  if (result.errors.length > 0) {
    throw new Error(`Failed to load content assets for ${city}:\n${result.errors.join("\n")}`);
  }

  return result.assets;
}

export async function loadAssetsWithDiagnostics(city: string): Promise<AssetLoadResult> {
  const cityDir = path.join(CONTENT_ASSET_ROOT, city);
  const entries = await readdir(cityDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  const assets: ContentAsset[] = [];
  const errors: string[] = [];

  for (const fileName of files) {
    const filePath = path.join(cityDir, fileName);

    try {
      const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
      const validation = validateAsset(raw);

      if (!validation.valid) {
        errors.push(`${fileName}: ${validation.errors.join("; ")}`);
        continue;
      }

      assets.push(normalizeAsset(raw));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${fileName}: ${message}`);
    }
  }

  return { assets, errors };
}
