import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadPrompt(projectRoot: string, relativePath: string): Promise<string> {
  const filePath = path.resolve(projectRoot, relativePath);
  return readFile(filePath, "utf8");
}
