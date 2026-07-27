import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureParentDir(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeMarkdownFile(filePath: string, markdown: string): Promise<void> {
  await ensureParentDir(filePath);
  await writeFile(filePath, `${markdown.trim()}\n`, "utf8");
}
