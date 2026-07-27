import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseCityContext } from "./schema.js";
import type { CityContext } from "./types.js";

export async function loadCityContext(projectRoot: string, city: string): Promise<CityContext> {
  const cityKey = city.trim().toLowerCase().replace(/\s+/g, "-");
  const filePath = path.resolve(projectRoot, "input", "cities", `${cityKey}.json`);
  const rawContent = await readFile(filePath, "utf8");
  return parseCityContext(JSON.parse(rawContent));
}
